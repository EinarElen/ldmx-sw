import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import MagicMock


BRIDGE = Path(__file__).resolve().parents[1] / "bridge"
spec = importlib.util.spec_from_file_location("event_bridge", BRIDGE / "event_bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class EventBridgeTest(unittest.TestCase):
    def fixture(self, count=1):
        root = MagicMock()
        file = root.TFile.Open.return_value
        file.IsZombie.return_value = False
        tree = file.Get.return_value
        tree.GetEntries.return_value = 3
        tree.GetEntry.return_value = 1
        branch = MagicMock()
        branch.GetName.return_value = "EcalSimHits_sim"
        branch.GetClassName.return_value = "vector<ldmx::SimCalorimeterHit>"
        tree.GetListOfBranches.return_value = [branch]
        collection = tree.EcalSimHits_sim
        collection.size.return_value = count
        collection.__getitem__.return_value.getPosition.return_value = [1, 2, 300]
        collection.__getitem__.return_value.getEdep.return_value = 4.5
        collection.__getitem__.return_value.getID.return_value = (3 << 17) | (2 << 12) | 19
        collection.__getitem__.return_value.getTime.return_value = 1.25
        return root, file

    def test_units_entries_and_branch_names(self):
        root, file = self.fixture()
        result = bridge.read_event(root, "input.root", 1)
        self.assertEqual(result["hits"][0]["position"], [1.0, 2.0, 300.0])
        self.assertEqual(result["hits"][0]["energy"], 4.5)
        self.assertEqual(result["entries"], 3)
        self.assertEqual(result["index"], 1)
        self.assertEqual(result["units"]["energy"], "MeV")
        self.assertEqual(result["hits"][0]["layer"], 3)
        self.assertEqual(result["hits"][0]["module"], 2)
        self.assertEqual(result["hits"][0]["cell"], 19)
        self.assertEqual(result["hits"][0]["source"], "sim")
        file.Close.assert_called_once()

    def test_bounds_and_cleanup(self):
        root, file = self.fixture()
        with self.assertRaisesRegex(ValueError, "outside"):
            bridge.read_event(root, "input.root", 3)
        file.Close.assert_called_once()

    def test_limits_are_explicit(self):
        root, _ = self.fixture(bridge.MAX_HITS + 1)
        result = bridge.read_event(root, "input.root", 0)
        self.assertEqual(len(result["hits"]), bridge.MAX_HITS)
        self.assertTrue(result["warnings"])
        json.dumps(result, allow_nan=False)

    def test_nonfinite_positions_rejected(self):
        with self.assertRaises(ValueError):
            bridge.vector([0, float("nan"), 0])

    def test_no_supported_collections(self):
        root, file = self.fixture()
        file.Get.return_value.GetListOfBranches.return_value = []
        with self.assertRaisesRegex(ValueError, "No supported"):
            bridge.read_event(root, "input.root", 0)

    def test_reconstructed_hit_accessors(self):
        root, file = self.fixture()
        tree = file.Get.return_value
        tree.GetListOfBranches.return_value[0].GetClassName.return_value = "vector<ldmx::EcalHit>"
        hit = tree.EcalSimHits_sim.__getitem__.return_value
        hit.getXPos.return_value = 2
        hit.getYPos.return_value = 3
        hit.getZPos.return_value = 4
        hit.getEnergy.return_value = 100
        result = bridge.read_event(root, "input.root", 0)
        self.assertEqual(result["hits"][0]["energy"], 100)
        self.assertEqual(result["hits"][0]["position"], [2, 3, 4])

    def test_detector_id_layouts(self):
        self.assertEqual(bridge.address((4 << 18) | (31 << 10) | 7, "Hcal"),
                         {"section": 4, "layer": 31, "strip": 7})
        self.assertEqual(bridge.address((3 << 8) | 12, "TS"), {"module": 3, "bar": 12})
        self.assertEqual(bridge.address((2 << 8) | 5, "Recoil"), {"module": 2, "layer": 5})

    def test_track_state_coordinate_frame(self):
        track = MagicMock()
        state = MagicMock()
        state.pos_ = [2, 3, 150]
        state.mom_ = [10, 20, 8000]
        state.ts_type_ = 2
        track.getTrackStates.return_value = [state]
        result = bridge.export_track(track, "Track", {"key": "track:0"})
        self.assertEqual(result["points"], [[2, 3, 150]])
        self.assertEqual(result["states"][0]["momentum"], [10, 20, 8000])

    def test_ts_reco_does_not_invent_position(self):
        hit = MagicMock()
        hit.getModuleID.return_value = 2
        hit.getBarID.return_value = 8
        result = bridge.export_hit(hit, "TrigScintHit", {"detector": "TS"})
        self.assertIsNone(result["position"])
        self.assertEqual(result["bar"], 8)

    def test_cluster_members_preserved(self):
        cluster = MagicMock()
        cluster.getHitIDs.return_value = [101, 202]
        cluster.getCentroidX.return_value = 1
        cluster.getCentroidY.return_value = 2
        cluster.getCentroidZ.return_value = 300
        result = bridge.export_cluster(cluster, "EcalCluster", {"detector": "Ecal"})
        self.assertEqual(result["hitIds"], [101, 202])
        self.assertEqual(result["position"], [1, 2, 300])


class SupervisorTest(unittest.TestCase):
    def run_supervisor(self, folder, command):
        (Path(folder) / "operation.json").write_text(json.dumps({"command": command}))
        return subprocess.Popen(
            [sys.executable, "-B", str(BRIDGE / "supervise.py"), str(folder)],
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
        )

    def test_exit_code_and_argument_boundaries(self):
        with tempfile.TemporaryDirectory(prefix="studio test ") as temp:
            folder = Path(temp)
            (folder / "heartbeat").touch()
            process = self.run_supervisor(folder, [
                sys.executable, "-c",
                "import sys; print(sys.argv[1]); sys.exit(7)", "literal ; $(no-shell)",
            ])
            output, _ = process.communicate(timeout=5)
            self.assertEqual(process.returncode, 7)
            self.assertIn("literal ; $(no-shell)", output)

    def test_cancellation_reaches_container_child(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder / "heartbeat").touch()
            pidfile = folder / "pid"
            process = self.run_supervisor(folder, [
                sys.executable, "-c",
                "import os, pathlib, time, sys; "
                "pathlib.Path(sys.argv[1]).write_text(str(os.getpid())); time.sleep(60)",
                str(pidfile),
            ])
            try:
                deadline = time.monotonic() + 4
                while not pidfile.exists() and time.monotonic() < deadline:
                    time.sleep(.05)
                self.assertTrue(pidfile.exists())
                (folder / "cancel").touch()
                process.communicate(timeout=5)
                self.assertEqual(process.returncode, 130)
                with self.assertRaises(ProcessLookupError):
                    os.kill(int(pidfile.read_text()), 0)
            finally:
                if process.poll() is None:
                    (folder / "cancel").touch()
                    process.communicate(timeout=5)

    def test_expired_heartbeat_does_not_start_job(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            heartbeat = folder / "heartbeat"
            heartbeat.touch()
            os.utime(heartbeat, (1, 1))
            process = self.run_supervisor(folder, ["/definitely/not/a/command"])
            process.communicate(timeout=5)
            self.assertEqual(process.returncode, 130)


if __name__ == "__main__":
    unittest.main()
