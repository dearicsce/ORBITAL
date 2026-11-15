# Engineering and release notes

Current architecture/build ownership: [Build and ownership](Docs/BUILD_AND_OWNERSHIP.md). Current campaign science: [Science and sources](Docs/SCIENCE_AND_SOURCES.md). Current acceptance: [UsabilityRelease ledger](Verification/UsabilityRelease-2026-11-11/LEDGER.md).

The material below is a **historical native Floodwatch record**. Its statements about missing campaign contracts and source acquisition do not describe the later browser campaign. Its test results are historical, not reruns against the current candidate.
# Engineering and release notes

The flight equations and historical acceptance results below describe the native Floodwatch route. The default Windows campaign uses the packaged browser engine. See the [campaign verification](Verification/Campaign-2026-11-09/README.md) and [browser model notes](Tools/EmbeddedUI/modelNotes.md) for the Earth, lunar, guided observatory and transfer routes.

## Milestone record

- Unity `6000.6.8f1` revision `237b6593792b` is installed at `F:/Unity/Editors`. Batch project creation resolved the editor entitlement and exited successfully. Windows x64 Mono support is present. Unity downloads were staged at `F:/Unity/Downloads`. At inventory, C: had 10.0 GiB free and F: had 61.6 GiB free.
- The browser source directory was a filesystem snapshot without a Git worktree. Existing browser backups and `F:/space-game-preserved-from-C-20261104` were found. This build was created in a separate Unity project. The browser physics and campaign regression tests passed before the port.
- The campaign adapter carries 28 contract records. Floodwatch is the only fully playable Unity contract. Other contracts are visible as reference records with prerequisites in the Atlas. The more distant atlas levels are schematic. The Academy is a resumable set of guided Floodwatch exercises using the current workspace.
- The Windows player uses procedural workshop assets and an offline Earth texture. The NASA EO-1 images on the Science Lab screen are historical reference scenes. Simulated science is represented by coverage and data quantities.

## Model assumptions

| Model | Operating assumptions |
| --- | --- |
| Frame and clock | Double-precision equatorial Earth-centered inertial state. The launch meridian is +X at T+0 and the initial launch pad moves east with Earth. Rendering projects state into local display units. The Earth rotates about its axis using simulated time. |
| Ascent | Point mass, midpoint integration with a step of at most 0.25 s and propellant-limited final burn segments. Rotating exponential atmosphere with density 1.225 kg/m³ at sea level and scale height 7.2 km. Constant drag coefficient 0.38 and authored reference area. Engines use constant nominal thrust and specific impulse. Lower-stage and optional booster propellant are modeled as a synchronized group. The upper controller uses altitude and radial-velocity feedback and cuts off at local circular tangential speed. Events conserve mass and retain actual inertial position and velocity. |
| Orbit and illumination | Two-body velocity Verlet propagation in 1 s steps. Fixed inertial Sun over the sortie and a cylindrical umbra. Geometric eclipse and contact boundaries are bisected within crossing steps. Operations run for 1.45 nominal periods after insertion. |
| Power | Fixed loads and illuminated solar output. The reserve check shows the full-at-entry estimate separately from the nominal operations forecast. Flight accounts for charge, overflow generation and unserved load. No battery aging or efficiency curve. |
| Communications | A single rotating equatorial station and an 8° elevation mask. Range divided by the SI speed of light gives one-way propagation delay. Receipts process at the next simulation boundary. Fixed rate, ideal pointing, daylight-only science transmission. Ground commands wait for geometric contact, incur one-way delay, then execute on the bounded clock. Acknowledgment also waits for visibility and propagation. The optional battery guard suspends imaging at 30 Wh and releases it at 38 Wh. |
| Observation | A gimballed educational camera observes a reference point near Manaus, with daylight, spherical visibility and angle checks. Flat-plane width and sampling are first-order estimates. Priority samples can replace background samples in the recorder. Historic NASA imagery provides context and does not enter scoring. |
| Structure | Fixed sockets, fairing envelope, feed compatibility, staging order and an off-axis torque check. Assembly motion is a visual preview. |
| Economics | Fictional catalogue prices, authored launch gates and mission criteria. Native reward once per mission, including when a browser completion is imported. |

Each dossier records the blueprint revision, pinned model version, resolved inputs, units, threshold, margin, calculation, assumptions, range and source per check. A SHA-256 revision binds the design fields, mission and model version. Launch re-evaluates the current design using its exact snapshot. Reports are offline-readable HTML, with source URLs for attribution.

## Replay and uncertainty

Flight samples store time, inertial state, battery, mass and data quantities. The black box replays the reviewed configuration and original command requests under the same deterministic environment, with one imager request added or omitted. The nine robustness trials cross three battery capacity factors with three array output factors and hold other inputs fixed. These authored bounds measure sensitivity and do not assign probabilities.

## Verification commands

- `Tools/CoreChecks`: independent circular orbit, energy, momentum, mass, battery and packet accounting, timing geometry, stage checks, snapshot mismatch rejection and nominal forecast-to-flight comparison.
- `EngineeringVerification.Run`: Unity JSON checkpoint round trip, repeat rewards, repeat browser import, unsupported records, report identity and campaign index.
- Browser baselines: `node tests/physics-audit.test.mjs` and `node tests/program.test.mjs`.

## Windows acceptance run

The release executable completed the custom U30 and extended battery playthrough at 720p on Intel Iris Xe. The forecast and recorded battery minimum were both 71.266174 Wh. Confirmed delivery was 616.748230 MB, including 12.54 MB from Manaus. The [playtest record](Verification/Floodwatch/README.md) links the screenshots and evidence exports.

## Scope remaining

Remaining contract gameplay, patched-conic encounters, polar and retrograde launch guidance, J2, entry and surface dynamics are outside the current build. The constrained workshop supports socket replacements and a linked booster pair. It has no freeform plumbing or stress solver. Atlas diagrams outside Earth's neighbourhood use illustrative scales. Selected browser spacecraft kits and launchers convert to explicitly labeled native equivalents. The archive retains all original records and the importer reports the supported counts.

NASA Space Apps submission readiness remains unverified. The exact challenge page and participant terms returned gateway errors during this review. The [official platform’s team page](https://www.spaceappschallenge.org/2026/find-a-team/missionforge/) contains the challenge summary. Full terms, asset review and eligibility for this pre-existing project remain release work.


