"""Validate emitted configs against this checkout's actual Python API.

Stage Python modules as CMake does, substituting only the install prefix and
linking the real detector data. This is a config/API check, not a Geant4 run.
"""

from pathlib import Path
import runpy
import sys
import tempfile


repository = Path(__file__).resolve().parents[2]
with tempfile.TemporaryDirectory() as temporary:
    prefix = Path(temporary)
    package = prefix / "python" / "LDMX"
    for source in repository.glob("*/python"):
        for file in source.rglob("*.py"):
            target = package / source.parent.name / file.relative_to(source)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(
                file.read_text().replace("@CMAKE_INSTALL_PREFIX@", str(prefix))
            )
    (prefix / "data").mkdir()
    (prefix / "data" / "detectors").symlink_to(repository / "Detectors" / "data")
    sys.path.insert(0, str(prefix / "python"))
    namespace = runpy.run_path(sys.argv[1])
    process = namespace["p"]
    assert process.max_events == 10
    assert process.run == 42
    assert process.output_files == ["events.root"]
    if sys.argv[2] in ("simulate", "hooks", "clusters"):
        assert len(process.sequence) == (7 if sys.argv[2] == "clusters" else 5)
        assert process.sequence[0].generators[0].energy == 8.0
        assert process.sequence[1].input_pass_name == "studio"
        actions = process.sequence[0].actions
        if sys.argv[2] == "hooks":
            assert [a.class_name for a in actions] == [
                "biasing::utility::StepPrinter",
                "biasing::utility::TrackProcessFilter",
                "simcore::PhotonuclearTracker",
            ]
            assert actions[0].track_id == 7 and actions[0].depth == 2
            assert actions[0].process_name == ""
            assert actions[1].process == "eBrem"
            assert actions[0].module_name == "Biasing_Utility"
        else:
            assert not actions
        if sys.argv[2] == "clusters":
            assert process.sequence[-2].algorithm == "clue3d"
            assert process.sequence[-2].rec_hit_pass_name == "studio"
            assert process.sequence[-1].hcal_hits_pass_name == "studio"
    else:
        assert len(process.sequence) == 4
        assert process.input_files == ["/workspace/events.root"]
        assert process.sequence[0].input_pass_name == "sim"
        assert process.sequence[1].sim_hit_pass_name == "sim"
        assert process.sequence[1].digi_pass_name == "studio_reco"
        assert process.sequence[2].input_pass_name == "sim"
        assert process.sequence[3].sim_hit_pass_name == "sim"
        assert process.sequence[3].input_pass_name == "studio_reco"
