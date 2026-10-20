"""Opt-in denv check using real LDMX dictionaries and a synthetic ROOT fixture.

This checks serialization/coordinate conventions, not reconstruction or physics.
"""
from pathlib import Path
import sys
import tempfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'bridge'))
from event_bridge import load_root, read_event
root = load_root()
with tempfile.TemporaryDirectory() as folder:
    path = str(Path(folder) / 'adapter-fixture.root')
    file = root.TFile(path, 'RECREATE')
    tree = root.TTree('LDMX_Events', 'Studio adapter fixture')
    vectors = {}
    def branch(name, kind, obj):
        objects = root.std.vector('ldmx::' + kind)()
        objects.push_back(obj)
        tree.Branch(name, objects)
        vectors[name] = objects
    track = root.ldmx.Track()
    track.setNhits(6)
    track.setNdf(2)
    track.setChi2(1.25)
    track.setCharge(-1)
    state = root.ldmx.Track.TrackState()
    state.pos_ = [2., 3., 150.]
    state.mom_ = [10., 20., 8000.]
    state.ts_type_ = root.ldmx.AtFirstMeasurement
    track.addTrackState(state)
    state.pos_ = [4., 5., 250.]
    state.ts_type_ = root.ldmx.AtLastMeasurement
    track.addTrackState(state)
    branch('RecoilTracks_reco', 'Track', track)
    straight = root.ldmx.StraightTrack()
    straight.setFirstSensorPosition([150., 2., 3.])
    straight.setSecondSensorPosition([250., 4., 5.])
    straight.setChi2(1.)
    straight.setNdf(1)
    straight.setNhits(2)
    branch('RecoilStraightTracks_reco', 'StraightTrack', straight)
    measurement = root.ldmx.Measurement()
    measurement.setGlobalPosition(2., 3., 150.)
    measurement.setEdep(0.2)
    measurement.setTime(1.)
    measurement.setLayerID(10)
    measurement.setNStrips(3)
    branch('RecoilMeasurements_reco', 'Measurement', measurement)
    hit = root.ldmx.TrigScintHit()
    hit.setModuleID(2)
    hit.setBarID(8)
    hit.setEnergy(0.4)
    hit.setPE(100.)
    hit.setTime(1.5)
    branch('TrigScintRecHitsPad1_reco', 'TrigScintHit', hit)
    cluster = root.ldmx.TrigScintCluster()
    cluster.setCentroid(8.25)
    cluster.setEnergy(0.8)
    cluster.setNHits(2)
    cluster.setPE(200.)
    cluster.setTime(1.5)
    cluster.setIDs(root.std.vector('unsigned int')([8, 9]))
    branch('TrigScintClustersPad1_reco', 'TrigScintCluster', cluster)
    tree.Fill()
    tree.Write()
    file.Close()
    event = read_event(root, path, 0)
    assert not event['warnings'], event['warnings']
    assert len(event['tracks']) == 2 and len(event['hits']) == 2
    for exported in event['tracks']:
        assert exported['points'] == [[2., 3., 150.], [4., 5., 250.]], exported
    ts = next(h for h in event['hits'] if h['detector'] == 'TS')
    assert ts['position'] is None and ts['module'] == 2 and ts['bar'] == 8
    assert event['clusters'][0]['centroid'] == 8.25
    assert event['clusters'][0]['hitIds'] == [8, 9]
    print('Real ROOT adapter checks passed: fitted track states, straight tracks, measurements, TS hits and clusters.')
