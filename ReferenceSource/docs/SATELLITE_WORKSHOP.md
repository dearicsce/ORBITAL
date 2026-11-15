# Satellite Workshop implementation and verification

Implemented on 4 November 2026 in the existing offline ORBITAL project. Run `Start-Game.cmd`, then choose **Satellite Workshop** on the home screen. No backend, account, CDN, package installation or external asset is required to play.

## Player-visible features

- A standalone workshop and mission-aware workshop. Mission briefs offer a new build, the saved library, an explicit mission preset, or the current working spacecraft. Changing missions retains the spacecraft. Launcher/orbit selection remains available. Mission context is retained in the workshop URL on reload.
- Four different structures: compact rail chassis, wider bevelled chassis, hexagonal module, and tall service/payload module. Spacecraft coordinates are metres, +X right, +Y top, +Z front, with the launch adapter at the origin. Six labelled faces have explicit outward normals; the bottom is reserved for the adapter.
- Individual component selection, hover names, independent wing selection, selection outlines, surface translation handles, mount-normal rotation, numeric placement, surface/grid/angle snapping, free draft preview, camera presets, mounting overlays, and stowed/interior previews. Escape restores a manipulation; pointer capture and window release prevent stuck drags. Highlighting uses independent helpers.
- Unique duplicates, a preview before linked mirrored placement, unlinking, reset placement, removal, and undo/redo. One drag is one history operation. Ordinary Save preserves undo; Save As and opening another blueprint establish a new working history.
- Internal batteries, computers, attitude packages and propulsion tanks occupy explicit bays. Integrated propulsion packs include controller/tank mass and an exterior thruster at a selected port. Port and bay conflicts are reported.
- Search, category tabs, availability/compatibility filters, two-item comparison, specifications, and inspectable models for locked equipment. Preview does not purchase or install anything.
- Named saves, Save As, thumbnails, editable role tags and notes, duplicate/rename/delete, portable JSON import/export, and a recoverable working draft. Library cards show mass, generation, usable battery energy, payloads, update time and readiness for the current mission. An unsaved working draft can be exported even when storage is unavailable.
- Explicit Save / Discard / Cancel handling. Storage and thumbnail failures are handled separately. Unknown catalogue IDs remain unresolved, inspectable drafts; they are not replaced with unrelated equipment. Unsafe JSON, invalid numbers, unsupported versions and oversized imports are rejected.
- Progression coins and permanent catalogue unlocks are separate from mission construction budgets. Claims and balances are committed together under a browser Web Lock. Reports cannot award the same run twice. A legitimate replay receives its replay reward.
- Fixed five-star mission difficulty is separate from the existing six-point performance/medal system. Cards/briefs show requirements, destination, prerequisites, rewards, completion status and compatible saved builds. Assistance does not change coin rewards.

## Catalogue totals

| Category | Definitions |
|---|---:|
| Bus | 4 |
| Solar power / independent wings | 20 |
| Batteries | 20 |
| Communications | 20 |
| Computers and storage | 20 |
| Attitude control | 20 |
| Integrated propulsion | 20 |
| Instruments and relay payloads | 24 |
| **Total** | **148** |

The payload category contains 21 scientific instruments and three relay payloads. Counts are unique definitions, not installed copies. Items have resource differences used by the engineering/operations model, installation metadata, model references, prices, units, and an educational-balance label. No discharge-rate, thrust, specific-impulse or battery-life advantage is advertised as simulated. Radiation-tolerant computer variants affect the existing radiation rules. Higher recorder capacity and processing throughput affect operations; specified radio pointing requirements affect preflight gates.

## Data, migration and persistence

The existing game/progress envelope remains schema version 2. The added assembly and blueprint contracts are version 1. A blueprint holds its identity, name, description, tags, timestamps, optional local thumbnail, bus identity and component instances. Instances hold catalogue/instance IDs, a bus parent, face or bay, surface-local position in metres, mount rotation in degrees, configuration, optional symmetry ID and placement status. Persisted data contains no Three.js objects or DOM references.

Legacy arrays remain the input format for the preserved tutorial and older saves. On workshop adoption, an assembly becomes authoritative. `projectAssembly` derives the legacy-shaped fields consumed by the existing simulator; they are not independently edited in the workshop. Engineering, review and operations use the same instance adapter.

Each old panel entry represented a **pair**. Migration creates two unique wing instances, each carrying half of its original mass, cost and nominal generation. Thus old totals are preserved exactly. Repeated instruments remain separate instances. Internal bay allocation accounts for module sizes. Existing completed records, assistance/settings, and campaign-earned access are retained. Historical completions do not receive retroactive coins; their new flights qualify for replay rewards. An old active flight without a reward identity does not receive a newly fabricated claim identity.

Named blueprints, the editable draft, mission deployment settings, flight snapshots and the wallet are separate. Blueprints do not embed a mission, launcher or orbit. Flights receive copied configuration, a unique run identity and their original evaluated hardware. Later blueprint edits or library deletion do not mutate that snapshot.

Local keys:

- Existing progress: `space_mission_game_state_v1`.
- Named library: `orbital_blueprints_v1`.
- Recovery draft: `orbital_workshop_draft_v1`.
- Wallet/unlocks/claims: `orbital_economy_v1`.
- Flight state remains in the existing tab-session store.

Writes are coalesced at a completed drag or committed form edit, not each pointer move. Recovery never silently updates a named save. A failed named write leaves an error state. Thumbnail failure allows the underlying spacecraft data to save. Local saves are specific to the browser **and origin, including port**; exports are portable backups. Named-library and draft edits use last-writer semantics between tabs; wallet mutations use Web Locks. Wallet updates fail explicitly on a browser without that locking capability.

New structural or lifetime constraints can make an overfilled or underfuelled old build a draft needing attention. Components and earned access are retained rather than silently removed or force-fitted.

## Engineering and geometry rules

Bus bay capacities are 8 / 12 / 18 / 24; propulsion port capacities are 2 / 3 / 4 / 6. Existing payload-interface capacities remain distinct. The current system supports one flight computer, communications unit and attitude package per bus. The 128-instance import guard is a data-size limit; actual readiness depends on physical/interface/resource constraints.

Mount coordinates are relative to named spacecraft surfaces, not the camera. A base must lie on a supported surface, fit its usable region, and have a valid parent. Internal occupancy, payload capacity, locked/unknown parts, unsupported tilts, disconnection, structural intersections and deployment/fairing interference block launch. Mission payload, pointing, power, budget, battery, reach and lifetime constraints are checked. Low margins and unsuitable orbits can produce advisories rather than additional arbitrary blocks.

Structural half-space proxies are separate from decorative meshes. A conservative wing envelope contains the complete 0–90° hinge path, including its support. Continuous-envelope and other external proxies detect interference; stowed bounds are compared with an authored educational launcher envelope. Placement is the outer component transform; deployment changes a child hinge; spacecraft attitude changes the whole craft parent. Animations do not replace saved placements.

Generation uses the disclosed guided tracking approximation:

`single-wing nominal output × (0.65 + 0.35 × |cos(mount angle)|)`.

The editor and fixed-step flight operations use the same result. Power forecasts assume deployment in orbit; the stowed switch is a mechanical preview. Shadow tracing is not implemented. Conservative obstruction rules block interfering geometry rather than claiming an unimplemented partial-shadow penalty.

## Verification

Reproduce pure checks with `node tools/verify-workshop-tests.mjs`. Start the normal local game server on port 8785, then run `node tools/workshop-cdp.mjs` for browser checks. The browser runner uses isolated test profiles, local Chromium and software WebGL; it does not operate the player's normal browser profile. It requires no npm dependency.

Pure checks performed:

| Suite | Assertions |
|---|---:|
| Workshop, migration, catalogue, library, wallet | 629 |
| Existing contracts | 225 |
| Existing flight completion | 31 |
| Existing orbit/engine/map/persistence | 735 |
| Existing mission-flow acceptance | 48 |
| Existing campaign/operations matrix | 86 |
| Existing numerical scene geometry | 33,162 |
| Existing Earth/Moon snapshot epochs | 16 |

The campaign matrix checks all twelve mission baselines with equipment obtainable at their actual prerequisite stage. Legacy-to-instance mass, power, cost, battery and propellant totals are compared. Import tests include unsafe structures, unknown definitions and locked equipment. Wallet tests include repeated callbacks, legitimate replay, insufficient balance, concurrent requests and failed atomic writes.

Browser evidence and terminal results are stored in `artifacts/workshop/`. The interaction suite covers independent front/rear wing placement, Save As, library duplication, mirror preview/link/unlink, undo/redo, cutaway/stowed controls, keyboard deletion protection, storage/thumbnail failures, comparison, real unlock clicks, imports and incompatible bus replacement. Native pointer tests exercise drag/one-step undo, rotation snapping, Escape rollback and release outside the viewport. Two actual browser tabs exercise the same purchase and reward concurrently.

| Chromium scenario | Passed checks |
|---|---:|
| Desktop workshop, 1440 × 1000 | 49 |
| Mobile workshop, 390 × 844 | 49 |
| Four-bus geometry and deployment matrix | 160 |
| Custom flight, operations, report and replay | 16 |
| Uninterrupted ascent/deployment flight | 16 |
| Existing browser engine / state / events | 15 / 33 / 23 |
| Real page reload and application entry | 11 |

The final desktop, mobile and bus-matrix captures were visually inspected. Evidence: [desktop](../artifacts/workshop/desktop.png), [mobile](../artifacts/workshop/mobile.png), [bus comparison](../artifacts/workshop/buses.png), [continuous flight result](../artifacts/workshop/flight-continuous.png). Native pointer and cross-tab results are recorded separately in `interaction-result.txt`.

The bus comparison checks all four buses at one angle and equivalent bus height: empty, small wings deployed, small wings stowed, large wings deployed, large wings stowed. Six hinge poses per assembly are checked without changing structural transforms. The custom-flight fixture uses a deterministic successful-launch fixture, an actual uninterrupted ascent/deployment path, the normal operations engine, report claims and a separate legitimate replay. Operations ticks are advanced through the same fixed-step engine rather than waiting for each real-time UI tick.

`tests/mission-flow-acceptance.test.mjs` previously passed arguments to `rateDesign` in the wrong order; it now calls its actual API. The old geometry assertion compared attachment positions with bounds inflated by decorative meshes; it now compares against the explicit structural surface with a tighter tolerance. No failing physics expectation was loosened.

## Files and modules

- `js/workshop/`: blueprint/schema adapter, structural interfaces, collision proxies, history, library, wallet, catalogue tables, compatibility and library summaries.
- `js/three/workshopAssembly.js`, `workshopView.js`: shared component construction, deployment layering, selection and manipulation.
- `js/ui/workshop.js`, `launchChecks.js`, `css/workshop.css`, `index.html`: editor and playable readiness integration.
- Updated `js/three/modularBus.js`, `solarWing.js`, `spacecraftParts.js`, `spacecraft.js`, `spacecraftInteract.js`, `launchScene.js` and `sceneKit.js` for bus geometry, connected wings, shared flight assembly and safe read-only review.
- Updated `js/contracts/validate.js`, `world.js`, `missionRun.js`; added `serializable.js`. Updated `js/designSanitizer.js` and engineering evaluate/gate/rating/operations/unlock adapters.
- Updated menu/router/mission selection/brief/review/simulation/report modules, campaign enrichment, authored difficulty data and its generated campaign adapter.
- Added workshop tests and local verification tools; refreshed relevant generated test results. Existing tutorials, mission IDs and launcher assets remain available.

The pre-change source archive is `backups/before-satellite-workshop-20261104.zip`.

## Simplifications and limits

- Clearance uses conservative proxies, so some visually close arrangements are rejected. There is no mesh-accurate contact solver or articulated shadow renderer.
- Wings use a connected single deployment hinge. Their rigid sections do not have separate independently simulated hinges.
- Catalogue statistics, bay envelopes, fairing constraints and guided propulsion values are authored educational balances, not measured hardware specifications. Thrust, specific impulse, structural loads and exact antenna beam geometry are not solved.
- Current catalogue attachments terminate at the bus. Arbitrary component-on-component structural chains are rejected.
- History is for the current editing session; it is not persisted across a page reload or switching blueprints. Named/draft edits across tabs follow last-writer semantics; wallet transactions are coordinated.
- Launch/deployment presentation follows elapsed time instead of the capped render delta, preserving pause behavior on slow rendering. Visual shadows automatically turn off after sustained low frame rates; simulation and structural validation are unaffected. Browser checks demonstrate actual rendering and interactions using software WebGL. They do not establish hardware-GPU frame rates; the host's native headless GPU path stalled during testing.
- The supplied rocket HTML references on `G:` could not be inspected after that drive became unavailable. This change uses the existing local launcher assets and does not claim those external models were integrated.

The requested catalogue category minima are implemented. No central workshop action is a placeholder. The limits above describe the implemented simulation scope, not planned functionality presented as verified.
