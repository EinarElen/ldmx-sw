"""LDMX-specific, bounded event export. Runs inside denv, never in the Qt host.

Adapters target this checkout's event classes and DetDescr ID layouts. Positions
use the LDMX global frame (x horizontal, y vertical, z downstream), mm and MeV.
"""
import json
import math
from pathlib import Path
import re
import shutil
import sys

MAX_HITS = 12000
MAX_OBJECTS = 2000
COLORS = {"Ecal": "#bc632d", "Hcal": "#8163a6", "Recoil": "#0074d9",
          "Tagger": "#617d98", "TS": "#c28b23", "Target": "#a63333"}
HIT_TYPES = {"SimTrackerHit", "SimCalorimeterHit", "EcalHit", "HcalHit",
             "TrigScintHit", "Measurement"}
CLUSTER_TYPES = {"EcalCluster", "HcalCluster", "TrigScintCluster"}
TRACK_TYPES = {"Track", "StraightTrack", "TrigScintTrack"}


def finite(value):
    value = float(value)
    if not math.isfinite(value):
        raise ValueError("Non-finite event value")
    return value


def vector(values):
    result = [finite(v) for v in values]
    if len(result) != 3:
        raise ValueError("Invalid three-dimensional position")
    return result


def detector(name, kind):
    if "ScoringPlane" in name:
        return "Scoring"
    if kind.startswith("Ecal") or name.startswith("Ecal"):
        return "Ecal"
    if kind.startswith("TrigScint") or name.startswith(("TriggerPad", "TrigScint", "TS")):
        return "TS"
    if kind.startswith("Hcal") or name.startswith("Hcal"):
        return "Hcal"
    for prefix in ("Tagger", "Recoil", "Target"):
        if name.startswith(prefix):
            return prefix
    return "Tracking" if kind in {"Measurement", "Track", "StraightTrack"} else "Other"


def address(raw, subsystem):
    # Canonical bit layouts: DetDescr/{EcalID,HcalID,TrackerID,TrigScintID}.h
    if subsystem == "Ecal":
        return {"layer": (raw >> 17) & 0x3f, "module": (raw >> 12) & 0x1f,
                "cell": raw & 0xfff}
    if subsystem == "Hcal":
        return {"section": (raw >> 18) & 7, "layer": (raw >> 10) & 0xff,
                "strip": raw & 0xff}
    if subsystem in {"Tagger", "Recoil"}:
        return {"layer": raw & 0xff, "module": (raw >> 8) & 0x1f}
    if subsystem == "TS":
        return {"module": (raw >> 8) & 0xff, "bar": raw & 0xff}
    return {}


def export_hit(hit, kind, base):
    record = dict(base, kind="hit", source="sim" if kind.startswith("Sim") else "reco")
    if kind == "Measurement":
        record.update(position=vector(hit.getGlobalPosition()), energy=finite(hit.getEdep()),
                      time=finite(hit.getTime()), layer=int(hit.getLayer()),
                      sensor=int(hit.getLayerID()), strips=int(hit.getNStrips()))
        return record
    raw = int(hit.getID()) & 0xffffffff
    record.update(id=raw, **address(raw, base["detector"]))
    record["time"] = finite(hit.getTime())
    if kind.startswith("Sim"):
        record.update(position=vector(hit.getPosition()), energy=finite(hit.getEdep()))
        if kind == "SimTrackerHit":
            record.update(trackId=int(hit.getTrackID()), pdg=int(hit.getPdgID()))
    elif kind == "TrigScintHit":
        # Reconstructed TS positions are not populated by all producers; use bar
        # coordinates, never silently draw these at the inherited default origin.
        record.update(position=None, energy=finite(hit.getEnergy()), pe=finite(hit.getPE()),
                      module=int(hit.getModuleID()), bar=int(hit.getBarID()))
    else:
        record.update(position=vector((hit.getXPos(), hit.getYPos(), hit.getZPos())),
                      energy=finite(hit.getEnergy()))
        if kind == "HcalHit":
            record["pe"] = finite(hit.getPE())
    return record


def export_cluster(cluster, kind, base):
    record = dict(base, kind="cluster", source="reco", energy=finite(cluster.getEnergy()),
                  count=int(cluster.getNHits()), hitIds=[int(i) for i in cluster.getHitIDs()][:MAX_HITS])
    if kind == "TrigScintCluster":
        record.update(position=None, centroid=finite(cluster.getCentroid()),
                      pe=finite(cluster.getPE()), time=finite(cluster.getTime()))
    else:
        record.update(position=vector((cluster.getCentroidX(), cluster.getCentroidY(),
                                       cluster.getCentroidZ())), layer=int(cluster.getLayer()),
                      rms=vector((cluster.getRMSX(), cluster.getRMSY(), cluster.getRMSZ())))
    return record


def export_track(track, kind, base):
    record = dict(base, kind="track", source="reco", points=[])
    if kind == "Track":
        # Stored TrackStates are already in the LDMX frame. Connecting them is
        # a guide between discrete states, not a field-propagated trajectory.
        states = []
        for state in track.getTrackStates():
            pos = vector(state.pos_)
            if pos != [-666.0] * 3:
                states.append({"position": pos, "momentum": vector(state.mom_),
                               "type": int(state.ts_type_)})
        states.sort(key=lambda state: state["position"][2])
        record.update(points=[s["position"] for s in states], states=states,
                      chi2=finite(track.getChi2()), ndf=int(track.getNdf()),
                      count=int(track.getNhits()), charge=finite(track.getCharge()),
                      representation="Stored track states")
    elif kind == "StraightTrack":
        # StraightTrack sensor positions use the tracking frame (z,x,y).
        points = [vector(track.getFirstSensorPosition()), vector(track.getSecondSensorPosition())]
        record.update(points=[[p[1], p[2], p[0]] for p in points],
                      chi2=finite(track.getChi2()), ndf=int(track.getNdf()),
                      count=int(track.getNhits()), representation="Two stored sensor positions")
    else:
        record.update(centroid=finite(track.getCentroid()), pe=finite(track.getPE()),
                      residual=finite(track.getResidual()), count=int(track.getNclusters()),
                      representation="TS bar-centroid association")
    return record


def read_event(root, path, index):
    file = root.TFile.Open(str(path))
    if not file or file.IsZombie():
        raise ValueError(f"Cannot open ROOT file: {path}")
    try:
        tree = file.Get("LDMX_Events")
        if not tree:
            raise ValueError("No LDMX_Events tree in this file")
        entries = int(tree.GetEntries())
        if not 0 <= index < entries:
            raise ValueError(f"Event index {index} outside [0, {entries})")
        tree.SetBranchStatus("*", 0)
        supported, collections, headers = [], [], []
        for branch in tree.GetListOfBranches():
            name, class_name = str(branch.GetName()), str(branch.GetClassName())
            match = re.fullmatch(r"(?:std::)?vector<ldmx::(\w+)(?:,.*)?>", class_name)
            kind = match.group(1) if match else ""
            category = "hits" if kind in HIT_TYPES else "clusters" if kind in CLUSTER_TYPES else "tracks" if kind in TRACK_TYPES else "metadata"
            meta = {"name": name, "type": class_name, "category": category,
                    "detector": detector(name, kind), "source": "sim" if kind.startswith("Sim") else "reco"}
            collections.append(meta)
            if category != "metadata":
                supported.append((name, kind, meta))
                tree.SetBranchStatus(name + "*", 1)
            elif class_name == "ldmx::EventHeader":
                headers.append(name)
                tree.SetBranchStatus(name + "*", 1)
                # EventHeader uses unprefixed split-member branch names in
                # current LDMX files, unlike the vector collection branches.
                pending = list(branch.GetListOfBranches())
                while pending:
                    member = pending.pop()
                    tree.SetBranchStatus(str(member.GetName()), 1)
                    pending.extend(member.GetListOfBranches())
        if not supported:
            raise ValueError("No supported LDMX hit, cluster or track collections")
        if tree.GetEntry(index) <= 0:
            raise ValueError(f"Could not read event {index}")
        payload = {"schema": 2, "index": index, "entries": entries,
                   "label": Path(path).name, "units": {"position": "mm", "energy": "MeV", "time": "ns"},
                   "hits": [], "clusters": [], "tracks": [], "collections": collections, "warnings": []}
        for name in headers:
            header = getattr(tree, name)
            payload["header"] = {"run": int(header.getRun()), "event": int(header.getEventNumber()),
                                 "weight": finite(header.getWeight())}
        for name, kind, meta in supported:
            collection = getattr(tree, name)
            count = int(collection.size())
            meta["count"] = count
            category = meta["category"]
            output = payload[category]
            before = len(output)
            available = max(0, (MAX_HITS if category == "hits" else MAX_OBJECTS) - len(output))
            if count > available:
                payload["warnings"].append(f"{name}: displaying {available} of {count} {category}.")
            for i in range(min(count, available)):
                base = {"key": f"{name}:{i}", "index": i, "collection": name,
                        "detector": meta["detector"], "color": COLORS.get(meta["detector"], "#8c9aa9")}
                try:
                    exporter = export_hit if category == "hits" else export_cluster if category == "clusters" else export_track
                    output.append(exporter(collection[i], kind, base))
                except (ValueError, OverflowError) as error:
                    payload["warnings"].append(f"{name}[{i}]: skipped invalid data ({error}).")
            meta["exported"] = len(output) - before
        return payload
    finally:
        file.Close()


def load_root():
    import ROOT
    ROOT.gROOT.SetBatch(True)
    for library in ("libFramework.so", "libSimCore_Event.so", "libEcal_Event.so", "libHcal_Event.so",
                    "libTracking_Event.so", "libTrigScint_Event.so"):
        if ROOT.gSystem.Load(library) < 0:
            raise RuntimeError(f"Cannot load {library}; source the LDMX install in denv")
    return ROOT


def main(args):
    if args == ["probe"]:
        from LDMX.Framework import ldmxcfg
        root = load_root()
        fire = shutil.which("fire")
        if not fire:
            raise RuntimeError("fire is not on PATH inside denv")
        print(json.dumps({"ROOT": root.gROOT.GetVersion(), "fire": fire, "LDMX": ldmxcfg.__file__}, indent=2))
    elif len(args) == 4 and args[0] == "event":
        payload = read_event(load_root(), args[1], int(args[2]))
        target = Path(args[3])
        temporary = target.with_suffix(".tmp")
        temporary.write_text(json.dumps(payload, allow_nan=False))
        temporary.replace(target)
        print(f"Read entry {payload['index'] + 1} / {payload['entries']}; "
              f"{len(payload['hits'])} hits, {len(payload['clusters'])} clusters, {len(payload['tracks'])} tracks.")
    else:
        raise ValueError("usage: event_bridge.py probe | event FILE INDEX OUTPUT")


if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except Exception as error:
        print(f"Studio event bridge: {error}", file=sys.stderr)
        sys.exit(1)
