# LDMX Studio

A native Qt 6 study workspace for LDMX: recipes, execution, retained outputs and
linked detector analysis. The workflow takes inspiration from
[FLAIR](https://fluka.cern/documentation/running/flair-gui), while specializing in
this checkout's LDMX event classes and v15 recipes. Studio runs on the host.
Builds, `fire`, PyROOT and LDMX dictionaries run inside the selected `denv`.

## Build and launch

Requires a C++20 compiler, CMake 3.24+, Qt 6.8+ with Quick, Quick Controls and
Quick 3D. Qt Test and Python 3 are used when `BUILD_TESTING=ON` (the default).
Build this directory independently of the simulation software:

```sh
cmake -S Studio -B Studio/build -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build Studio/build --parallel 4
Studio/build/ldmx-studio --workspace "$PWD"
```

Open an existing event file directly with
`--open-event /path/inside/workspace/events.root --entry 0`.
When combined with `--screenshot`, capture waits for the real event to load.
`--page study|recipe|runs|analysis` selects a document (and the captured document
when using `--screenshot`).

Run from a terminal whose PATH contains `denv`. The workspace must contain
`.denv/config`. Its container shell setup must expose an installed `fire`,
LDMX Python modules and shared libraries. For a development checkout, configure
it with `just configure` before using **Environment → Build + install**.
The native Studio build does not require ROOT or Geant4 on the host.

**Environment → Check environment** checks `fire`, LDMX Python and the event
dictionaries through `denv`. A stopped container runtime is reported in the
console. The application does not initialize denv or configure LDMX automatically.

## Study workflow

1. Create or open a study using the **Study** menu. Add notes in the Study
   document and attach existing LDMX datasets.
2. Edit the active named recipe in **Recipe**. Duplicate it to try a different
   run, input, processing chain or hook configuration. Select an outcome:
   **Energy deposits**, **Detector response**, or **Showers & clusters**.
   Studio includes the necessary processing steps. Select a stage in the
   experiment drawing to inspect its explanation. **Implementation details**
   reveals algorithms, run/seed and hooks; **View generated Python** opens the
   exact generated configuration, which updates immediately.
3. **Run recipe** starts a denv job with a snapshot of that recipe. Editing the
   study afterwards does not change the snapshot. Build and environment checks
   remain accessible through **Environment**.
4. **Runs** lists recipe executions, statuses and outputs. Clear **This study**
   to see the entire workspace's history, including earlier scratch runs.
   Reopen a completed output, inspect its saved Python or log, or restore a
   snapshot as a new editable recipe.
5. **Analysis** opens four linked detector panels. Replace any panel's view,
   focus it using the expand control, or return to four simultaneous views.

Studies autosave atomically under `.ldmx-studio/studies/<id>.json`. They contain
notes, named recipes, attached dataset paths and the selected analysis views.
The last study reopens on launch. Splitter sizes are stored in Qt settings.
The current workflow runs one container operation at a time; it is not a batch
scheduler. File paths remain local to the selected workspace.

Supported recipe building blocks:

- A standard 8 GeV electron gun upstream of the tagger in `ldmx-det-v15-8gev`.
- Event count and run number, which controls LDMX's default seed service.
- Optional ECal/HCal digitization and reconstruction with v15 conditions.
- Optional ECal CLUE3D and HCal clustering, with explicit input passes.
- Optional Geant4 user-action blocks for diagnostics and truth persistence.
- Reprocessing of existing simulation files with an explicit input pass.
- Read-only preview of the exact Python recipe generated for each run.
- Asynchronous `denv` jobs, persistent logs, and cancellation inside the container.
- ROOT event browsing, detector collection selection and energy thresholds.

Input ROOT files must be within the workspace, including when resolving
symlinks. This ensures they are visible through denv's workspace mount. The
first implementation rejects whitespace in the workspace path because denv 1.x
splits its mount list on whitespace.

## Interaction design

The central document is the experiment or event being studied. Keep controls
close to that object and make their effect visible. The recipe scene and outcome
glyphs are explanatory drawings, not predictions or previews of simulated data.
The drawing is clickable; its stage buttons also support keyboard navigation.

The interaction references are
[Dorico's task modes](https://www.steinberg.help/r/dorico-elements/6.2/en/dorico/topics/program_concepts/program_concepts_modes_c.html)
and [MuseScore's palettes and properties](https://handbook.musescore.org/en_gb/basics/using-the-palettes):
keep the primary work visible and expose properties in context.

When extending Studio:

- Lead with scientific intent and visible results. Prefer a detector selector,
  layer ribbon or linked plot over another generic parameter form.
- Let selecting an object reveal its explanation and controls. Keep exact
  collection names, IDs, algorithms and Python available through details.
- Use supported LDMX defaults and include prerequisites automatically. Do not
  silently discard required input information or hide errors.
- Preserve direct access for experienced users. Disclosure is a presentation
  choice, not a separate restricted execution mode.
- Give custom controls keyboard focus, accessible names, selected states and
  meaningful native interaction tests.

The output pane starts collapsed and opens for execution or explicit inspection.
The recipe's technical disclosure includes the input pass when the existing-event
source stage is selected. Reprocessing still requires the correct pass name; it
is not inferred automatically.

## Linked detector views

| View | Specialized controls |
| --- | --- |
| Detector overview | GPU-instanced hits, orbit, zoom and schematic detector envelopes |
| ECal | XY shower projection with equal spatial scale, ZX depth projection, layer slice, clickable 34-layer energy profile, reconstructed cluster centroids |
| HCal | Clickable schematic section map, layer–strip occupancy or time–layer projection; populated sections are marked and selected initially when available |
| Tracking | Tagger/recoil/TS ZX or ZY hits, reconstructed track-state guides, optional links between hits sharing a truth track ID |
| Trigger scintillator | Module–bar occupancy using decoded TS IDs; reconstructed hits retain bar/PE information without inventing global positions |

Scroll to zoom, drag to pan (or orbit in 3D), and use **Reset** to restore the
view. Hit markers are glyphs, not cell-solid outlines. Clicking a projected hit
updates the shared inspector. Picking a reconstructed cluster highlights matching
constituent channel IDs in the selected hit collections. The inspector exposes
the exact collection, object index, detector address, energy, time, position and
available track/cluster parameters.

Simulated deposits and reconstructed energies are separate source selections.
Each panel's **Data** control reveals exact hit-collection selection. Its default selects the first
available collection per subsystem (per TS module), avoiding sums across
processing passes. Reconstructed overlays and the inspector retain their exact
collection names, including when several passes contain clusters or tracks:
hover an object or open **Object details** to inspect its collection. The full
collection inventory is under **Data collections**.
The footer sums the selected hit collections, layer or section above the
threshold. The energy profile covers all ECal layers even while a single layer
is shown, and labels the peak bin energy.

The bridge explicitly supports `SimTrackerHit`, `SimCalorimeterHit`, `EcalHit`,
`HcalHit`, `TrigScintHit`, `Measurement`, `EcalCluster`, `HcalCluster`,
`TrigScintCluster`, `Track`, `StraightTrack` and `TrigScintTrack`. Detector-address
decoding follows `DetDescr` headers. Scoring-plane hits are kept separate from
calorimeter hits. `Track` states retain their documented LDMX global frame;
`StraightTrack` sensor coordinates are converted from its stored (z,x,y) frame.
TS cluster and track summaries remain in the inspector where no reliable global
position is stored.

The schema-2 payload exports one entry at a time, bounded to 12,000 hits, 2,000
clusters and 2,000 tracks, with explicit truncation/invalid-data messages.
Positions use mm, time ns, and deposited/reconstructed energies MeV.

Detector guides are **approximate envelopes**, not imported GDML or precise
survey geometry. The illustrative example is synthetic and clearly labeled.
Track lines join stored states or truth hits; they are not field-propagated
trajectories. There are no particle-history, accumulated histogram or GDML views yet.
Reprocessing assumes v15 simulation inputs; it does not infer detector
conditions from arbitrary files.

## Geant4 hook blocks

**Geant4 hooks** under **Implementation details** in the recipe editor combines three optional blocks. All are
off initially. Selections update the Python preview and are stored as a typed
`hooks` list in `recipe.json`; generated Python attaches them to `sim.actions`.
The configuration validator rejects unknown blocks, duplicate blocks, unsupported
parameters and hooks on reprocessing jobs. Switching to reprocessing in the GUI
excludes hooks while preserving the simulation selections for switching back.

| Block | Parameters and behavior | Result |
| --- | --- | --- |
| Print track steps | Positive Geant4 track ID, descendant depth 0–3; depth 0 selects only that track | `Biasing.util.StepPrinter` prints to the session log; IDs restart each event |
| Keep tracks from a process | Creator-process name contains `eBrem`, `conv`, `photonNuclear` or `electronNuclear` | `Biasing.util.TrackProcessFilter` retains matching tracks in `SimParticles` |
| Record photonuclear interactions | Uses `SimCore.user_actions.PhotonuclearTracker` | Writes `PhotonuclearInteractions` when interactions occur |

These blocks use the checkout's existing compiled UserActions. Step traces can
be verbose, and track retention can substantially increase output size. The
photonuclear recorder does not bias the interaction rate. Truth and interaction
records remain in ROOT; the viewer does not yet expose those truth histories.
See LDMX's [UserActions documentation](https://ldmx-software.github.io/using/sim/configuring.html#useractions).

This is the first layer of a bounded hook editor. A later custom-rule layer could
compose a callback (step / track / event), typed predicates (PDG ID, creator
process, volume, energy with units), and an action (record, count, retain).
Such rules need a compiled runtime adapter and explicit semantics for matching
and ordering. Event rejection or track termination would also need bookkeeping
for attempted versus accepted events. Arbitrary C++ or Python callbacks and
general condition composition are not implemented by this prototype.

## Session and process model

Every operation creates `.ldmx-studio/runs/<UTC timestamp>-<unique id>/`.
Simulation sessions contain `recipe.json`, generated `config.py`, `console.log`,
an operation manifest, a completion result, and ROOT outputs from `fire`.
Environment checks and event exports create their own operation folders.
Sessions are scratch work but are retained until explicitly removed; closing the
application never deletes results.

Qt's `QProcess` invokes the constant command `denv python3 -u supervise.py .`.
The actual job arguments travel through `operation.json`, since denv's entrypoint
joins its arguments into a shell command. A small Python supervisor reads that
argument list inside denv and launches the job in its own process group without
a shell. Paths containing spaces or shell metacharacters retain their meaning.
The host writes heartbeat and cancellation files into the mounted operation
folder. The supervisor stops the job on cancellation or if the heartbeat is
missing/stale for 20 seconds. A normal window close is blocked while busy so the
user can cancel and wait. This avoids relying on killing the Docker CLI to stop
a container job. A stalled container launcher before the supervisor starts is
not currently force-killed by the GUI.

The event bridge loads ROOT dictionaries in the container and writes a versioned
JSON payload. The host never links to LDMX libraries. A new denv invocation is
used for each event; this prioritizes isolation over browsing latency.
`StudyStore` owns local study documents and discovers run manifests.
`StudioController` owns execution and the loaded event. QML documents own
interaction state; all detector panels share event navigation and selection.

## Design direction

White and grey working surfaces, navy text, blue selection, compact controls,
and an unobstructed event view. The actual LDMX logo and color references are
documented in [assets/README.md](assets/README.md). This design derives from
LDMX's software identity rather than a generic dashboard theme.

The Qt implementation uses typed C++ objects exposed with `QML_ELEMENT`,
`qt_add_qml_module`, Qt Quick Controls, Qt Quick 3D instancing, and nonblocking
`QProcess`. Relevant Qt documentation:

- [QML modules with CMake](https://doc.qt.io/qt-6/qtqml-modules-cmake-integration.html)
- [Qt Quick 3D](https://doc.qt.io/qt-6/qtquick3d-index.html)
- [QProcess](https://doc.qt.io/qt-6/qprocess.html)

The next larger increments can stay LDMX-specific: a versioned detector scene
derived from our GDML/conditions, cluster-to-track matching and residuals, an
ECal layer mosaic and shower-axis inspector, HCal timing/PE views, TS pulse and
coincidence tools, run comparisons and accumulated observables, tracking recipe
presets, and a persistent container reader. None requires a generic ROOT browser
or arbitrary geometry editor. Full custom Python remains a separate execution
path rather than a promise to round-trip arbitrary code through the form editor.

## Checks

```sh
ctest --test-dir Studio/build --output-on-failure
cmake --build Studio/build --target ldmx-studio_qmllint
Studio/build/ldmx-studio --example --screenshot /tmp/ldmx-studio.png
```

Tests cover config generation against the checkout's Python API, study persistence,
recipe isolation, history restoration, workspace/symlink boundaries, typed event
serialization, argument preservation and cancellation. The native workbench test
uses a temporary workspace and checks live recipe-to-Python updates, layer
selection, linked picking, focused/replaced views and reopening a study. Native
mouse clicks also check outcome prerequisites, contextual stage selection and
technical disclosure; generated Python remains accessible on demand.
They do not replace an integration run using real ROOT files and an installed
LDMX environment.

With the container runtime running and LDMX installed, run the opt-in integration
check:

```sh
Studio/build/studio-integration --workspace "$PWD"
# Enable all three hook blocks and verify real primary-track step output:
Studio/build/studio-integration --workspace "$PWD" --hooks
# Generate and reprocess real ECal/HCal clusters:
Studio/build/studio-integration --workspace "$PWD" --clusters
# Real dictionaries and a synthetic ROOT fixture for tracking/TS adapters:
denv python3 Studio/tests/check_event_api.py
```

It uses the GUI's controller to check the environment, simulate two events with
calorimeter reconstruction, load both entries, reprocess the output, and cancel
a subsequent job after event processing starts inside the container. It checks
reconstructed collections in the expected output passes, and uses an input path
containing spaces, quotes and a semicolon. It prints the retained ROOT file paths.

Verified on 2026-10-20 on an Apple Silicon host with Docker Desktop and the
ARM64 `ldmx/dev:latest` image (image ID prefix `5335a4e9d2f3`, ROOT 6.38.04).
LDMX was configured with `just configure-quick`, then built and installed with
two parallel jobs. The integration check passed: two 8 GeV electron events at
run 12001 exported 365 and 351 displayed hits; reprocessing added nonempty
`EcalRecHits_studio_reco` and `HcalRecHits_studio_reco` collections. Active-run
cancellation returned 130 and left no container running. The native Qt window
was also rendered with the first real event loaded. These are workflow checks,
not validation of detector response or physics.

The hook-enabled check also passed in this environment. For the first event,
the eBrem retention block increased stored `SimParticles` from 27 to 3,019
(eBrem-created particles: 6 to 2,998), while the hit export still contained 365
hits. The ROOT output also contained photonuclear interaction records.
This verifies execution and persistence, not the physical correctness of the
recorded interaction genealogy.

The clustered run also passed: the first event exported an ECal cluster with 141
constituent hits and an HCal cluster with one constituent hit; reprocessing
produced the corresponding `studio_reco` collections. Real-dictionary fixture
checks passed for fitted track states, straight-track coordinate conversion,
tracker measurements, TS reconstructed hits and TS clusters. Those fixtures
test data handling; no fitted-track reconstruction validation is claimed.
