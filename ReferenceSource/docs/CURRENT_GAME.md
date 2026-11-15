> Latest 2 Nov 2026 update: see [ORBIT_GEOMETRY.md](ORBIT_GEOMETRY.md). New flights use geometric eclipse/contact and shared builder forecasts; playable buses are original modular shells; launch terrain has local 2K CC0 PBR textures. Earlier fixed-fraction/GLB bus descriptions below are historical. Fresh rendered visual acceptance remains pending.

# Current game: implementation reference

This document describes the code after the ORBITAL campaign/operations upgrade. It is not the target roadmap.

## Technology and startup

- Browser ES modules; Three.js 0.160 is bundled under `vendor/three` and mapped in `index.html`.
- Local JSON defines engineering parts, instruments, launchers, orbital scenarios, events and original missions.
- `js/data.js` loads `data/world1.json`, then `enrichCampaign()` adds nine missions and metadata for the original three.
- `js/main.js` loads data and characters, restores progress, sanitizes component choices, initializes the router and opens the requested screen.
- Model preload is no longer a startup gate. Models load when a screen needs them. Optional cutscene metadata loads in the background.
- Windows PowerShell server serves local files, GLBs, Draco WASM and video ranges. There is no required online backend.

## Current navigation

```text
Menu
 ├─ Enter/continue campaign → Campaign → Brief
 │    ├─ Load starter spacecraft → Builder
 │    └─ Design from scratch → Rocket → Orbit → Builder
 │                                           ↓
 │                              Advisory → Review → Launch
 │                                                   ↓
 │                                   failure → Report
 │                                   success → Operations → Report
 │                                                            ├─ Retry → Builder
 │                                                            ├─ Next available mission → Brief
 │                                                            └─ Campaign
 ├─ Flight academy → guided orbit/builder training → launch → training report
 ├─ Earth intelligence → two historical image comparisons + interpretation questions
 └─ Settings → audio and two-click progress reset
```

`js/ui/router.js` owns transitions. Before entering mission screens it checks the selected mission, prerequisites, launcher availability, orbit presence and tutorial launch eligibility. A renderer can return a cleanup function. The router calls cleanup, stops the menu globe and clears dialogue before rendering another screen.

Standalone screens are menu, campaign and evidence. Evidence must not require a launch vehicle. Training can return to menu; it is no longer a compulsory gate to the campaign.

## Files and responsibility

| File | Responsibility |
|---|---|
| `js/campaign.js` | Twelve-contract campaign, chapters, explicit prerequisites, editable starter designs |
| `js/data.js` | Fetch base data and enrich campaign |
| `js/state.js` | Current design, campaign records, settings, browser persistence |
| `js/designSanitizer.js` | Remove invalid/locked part selections and enforce array/slot limits on load |
| `js/engine/evaluate.js` | Static engineering totals and predictions |
| `js/engine/gate.js` | Ten launch checks |
| `js/engine/rating.js` | Engineer/scientist/accountant ratings |
| `js/engine/operations.js` | New deterministic operational-window model and objective checks |
| `js/events.js` | Original precomputed event model and hard-mode launch roll |
| `js/flightOutcome.js` | Flight rating, launch failure cap and optional operations science adjustment |
| `js/flightSession.js` | In-memory and sessionStorage flight snapshot |
| `js/ui/menu.js` | ORBITAL title scene, campaign/training/evidence/settings entry |
| `js/ui/missionSelect.js` | Chapter filters, difficulty, twelve contracts and unlock explanations |
| `js/ui/brief.js` | Mission objective, budget, lifetime, starter/scratch choice |
| `js/ui/design.js` | Existing builder, part catalogue, resource table and tutorial integration |
| `js/ui/simulation.js` | Launch, operations handoff and operations refresh restoration |
| `js/ui/operations.js` | Routes campaign missions to new mission control; retains training playback |
| `js/ui/missionControl.js` | Commands, clock, objective progress, telemetry plots and incident dialogs |
| `js/ui/report.js` | Final report, measured objectives, decision log and progression |
| `js/ui/evidence.js` | Historical NASA image comparisons and interpretation questions |
| `js/three/launchScene.js` | Existing rocket ascent, separation, particles, environment and deployment handoff |
| `js/three/launchSpace.js` | Payload release and deployed spacecraft operations view |
| `js/three/orbitOps.js` | Operations scene used when no renderer continuation exists |
| `js/three/worldBody.js` | Earth texture or NASA LRO-derived lunar colour/bump presentation |
| `js/three/earth.js` | Menu globe, atmospheric limb and orbit lines |
| `js/three/models.js` | Manifest lookup, Draco/GLB loading, caching, normalization and fallbacks |
| `css/orbital.css` | New menu/campaign/brief/launch presentation |
| `css/mission-control.css` | Operations and measured-results presentation |
| `css/evidence.css` | Before/after image-comparison layout |

## Current spacecraft design schema

```js
{
  schemaVersion: 2, missionId, difficulty, launcherId, orbitId,
  busId, commsId, computerId, pointingId,
  panelIds: [], batteryIds: [], fuelIds: [], instrumentIds: []
}
```

Singular fields hold one component ID. Array quantities are represented by repeated IDs. The sanitizer currently caps panel, battery and fuel arrays at two; payload array length is capped by bus slots. A visually paired solar-wing assembly represents one panel item and its specified electrical generation; do not double its generation because two wings render.

## Static engineering rules

1. Launch mass sums bus, panels, batteries, radio, computer, pointing equipment, fuel packs and payload mass. Fuel-pack mass includes the pack's tank contribution.
2. Capacity selects the launcher's destination class (LEO/GTO/TLI) and multiplies the orbit's scenario capacity factor.
3. Load is the sum of bus load, communications, computer, pointing and instrument power.
4. Power check requires panel generation at least `1.1 × load` by default.
5. Eclipse battery requirement is load W times the orbit's eclipse hours. Usable capacity defaults to 80% of nominal Wh.
6. Raw data is summed instrument GB/day. Computer throughput caps evaluated data production. The gate separately requires computer throughput to cover the uncapped raw rate.
7. Downlink GB/day is radio base capacity × orbit distance factor × contact hours.
8. Delivered fraction is `min(1, downlink / processed data)`; zero data defaults to fraction one for relay payloads.
9. Fuel requirement is insertion fuel + annual burn × target years. Lifetime is remaining post-insertion fuel divided by annual burn, capped for scoring at target lifetime.
10. Cost includes component cost, launcher cost, extra orbital launch cost and operational cost over the target lifetime.
11. Mission science is instrument value × mission relevance, summed and multiplied by orbit fit, delivered fraction and lifetime factor.
12. Engineering margins are `(capacity - usage) / capacity` for lift, power, battery, downlink and fuel.

These values are educational abstractions. The present model does not calculate delta-v, real launch payload curves, instantaneous link budgets, geographic coverage, actual thermal balance or time-resolved lifetime degradation.

## Ten launch gates

Launch mass; budget; power margin; eclipse battery; instrument slots; computer throughput; pointing compatibility; insertion fuel; communications unit; launcher reach.

The gate checks fuel for insertion, while the report's fuel margin considers target lifetime. An adequately inserted but short-lived craft can therefore pass launch checks and receive a poorer lifetime result. Explain this distinction; do not silently change it while only editing visuals.

## Ratings and progression

Engineer, scientist and accountant each award up to two stars. Engineer uses the weakest static margin and original event failures. Scientist uses mission-specific science thresholds. Accountant uses total budget fraction. Total maximum is six; default campaign pass requires three.

New campaign runs additionally require all measured operational objectives. A cheap spacecraft with no useful observations must not pass merely because the other judges award stars. `rateFlight()` scales scientist stars using the operational science factor and reports actual returned GB. `js/flightCompletion.js` supplies the shared completion predicate used by the report and persistence API. A new award requires successful launch, matching mission identity, a completed window, achieved finite objective values and passing finite stars.

Existing historical save records remain valid. `completeMission(missionId, rating, passStars, flight)` now rejects missing flight evidence. Historical star-only records are preserved by loading them directly; they do not pass through the new-award gate. Older active-session summaries are recomputed from their stored operations state.

Original milestones: m1 unlocks medium bus, larger panels/batteries, advanced computers and radar; m2 unlocks lunar launcher, precision payloads, larger fuel and radio; m3 unlocks the large bus, distant-orbit scenario and extended Atlas scenario. Side missions grant completion records but do not currently unlock new hardware.

## Operations: exact current mechanics

- One flight window has 120 ticks.
- Each tick represents 4.5 simulated minutes: total 540 minutes (nine hours).
- It is a sampled operational window, not a simulation of the entire one-to-three-year mission.
- Environment repeats every 20 ticks: six illustrative passes.
- `phase = (tick % 20) / 20`.
- Sunlit when `phase < 1 - profile.eclipse`.
- Ground contact when `phase >= 1 - profile.contact` and no contact outage is active.
- These profile fractions come from mission content, not calculated orbit geometry.
- Modes: auto, observe, downlink, safe. Auto selects safe below 22% battery or above 64°C, otherwise downlink during contact if recorder contains >0.05 GB, otherwise observe.
- For new schema-2 runs, base load excludes radio power. Safe mode uses 40% base plus radio standby, Observe uses base plus payload plus standby, and Downlink uses base plus transmit. Relay service uses transmit power. Static prelaunch review still budgets full radio power. Legacy active hardware snapshots retain the old radio-inclusive base load.
- Solar generation is panel W in sunlight, zero in eclipse. Energy changes by `(generation - load) × 4.5 / 60` Wh, clamped to battery capacity.
- When energy cannot cover the requested load, the tick is an outage and the craft switches to safe mode.
- Temperature follows a gameplay increment/cooldown model, not a physical thermal solver.
- Relevant observing produces instrument data in GB/day converted by `4.5/1440`. Computer throughput limits that rate.
- Recorder capacity is an explicit `recorderCapacityGb` avionics field: 8/24/12 GB for Basic/Advanced/Rad-hard. Processing throughput no longer determines storage capacity. These remain authored game-balance values; a separate recorder part is not implemented.
- Full storage rejects new data into `lostGb`. Resetting the recorder also moves its previous contents into `lostGb`.
- During valid contact, downlink transmits `downlinkGbDay / contactFraction / 1440 × 4.5`, capped by stored data.
- Collected data must equal delivered + stored + lost, within floating-point tolerance.
- Coverage currently measures relevant observing time × orbit-fit × efficiency divided by the window; it is not a geographic footprint.
- Night-watch opportunity is normalized to eclipse time.
- Relay availability presently measures powered relay observation mode; detailed Earth-to-user contact topology and packet queues are NOT implemented.
- Powered-operations objective permits at most 10% outage time.
- Incidents occur at ticks 32 and 78 on normal/hard; easy has no operational incidents.
- Incidents suspend time until a valid response. Paused time and unresolved incidents never advance the engine.
- UI speed 1x/2x/4x changes tick scheduling only. State mutation remains one fixed tick per engine call.
- Every tick and response persists state. Refresh in operations resumes the window without another launch.

## Incident choices

| Incident | Response A | Response B |
|---|---|---|
| Ground contact | Wait: lose eight ticks of contact | Maneuver: consume 3 kg fuel |
| Battery warning | Five ticks safe recovery | Continue with 20% lower battery capacity |
| Payload heat | Five ticks safe cooldown | Continue with 20% less science efficiency |
| Recorder integrity | Four ticks safe diagnostic | Clear undelivered data |
| Radiation alert | Five ticks protected mode | Unhardened computer loses 25% science efficiency |
| Conjunction | Consume 3 kg fuel | Seven ticks protected reorientation |

Fuel responses are disabled when reserve is insufficient. Decisions are appended to the report log. These are game scenarios; the conjunction alternative is not a claim that reorientation alone physically removes a collision risk. The target specification replaces it with explicit avoidance trajectories and probabilistic risk.

## Persistence

`localStorage['space_mission_game_state_v1']`: current mission/design, difficulty, training completion, best mission records, settings.

`sessionStorage['space_mission_flight_v1']`: design snapshot, mission, static evaluation, launch outcome, events, phase, operations state and operations summary. Session storage is browser-tab scoped; do not promise it survives closing the browser.

Schema-2 mission runs store initial/current xorshift32 seed state, simulation/scoring versions, blueprint/mission snapshots and monotonic command history. Hard launch and legacy event draws use the stored stream; operational incident ticks remain authored/deterministic. Report/load never rerolls an outcome. Legacy sessions migrate with their existing outcome and load model.

## Graphics now

- Four playable launcher IDs now use complete original procedural stage/interstage/adapter/fairing assemblies. Original supplied GLBs remain preserved. Visuals are educational approximations, separate from performance data.
- Menu has the existing Earth texture plus atmosphere and subtle orbit curves.
- Campaign retains existing photos and uses NASA LRO-derived lunar imagery on the later lunar cards. The deep-space observatory is no longer styled as a Moon mission.
- Lunar orbit uses NASA SVS CGI Moon Kit colour imagery and an artistic LOLA-preview bump map. It is not a calibrated terrain/landing solver.
- Launch has payload mass, destination, elapsed presentation time, flight phase, pause, skip and timeline progress.
- Flight telemetry is explicitly a compressed presentation; no fabricated real altitude/velocity numbers were added.
- Operations retain the actual assembled spacecraft and support smooth globe/craft animation.
- Distant-orbit presentation remains schematic. The current `lagrange` curve is not a real halo-orbit solution.

## Evidence library

Four images copied from the user's Connected Earth ZIP are used in a native before/after slider. No React runtime was imported. NASA sources verify Spalte dates (1986/2020) and Mýrdalsjökull dates (1986/2014). A USGS source explains why differing snow cover prevents a naive white-pixel estimate of glacier change. This library is historical reference, explicitly separate from simulated mission output.

## Known gaps to address first

1. Completion invariants were centralized and browser-verified on 2 November 2026; retain this rule as later models evolve.
2. Recorder capacity and radio mode loads are explicit after Prompt 03; separate recorder hardware and richer radio/link models remain later work.
3. Geography, real orbital propagation, station line of sight and observation footprints are not yet modelled.
4. Relay service does not yet require an end-to-end path to Earth; introduce packet queues and contact-aware service objectives.
5. Conjunction response and radiation logic are educational simplifications, not mission safety models.
6. Map/mission-specific scientific products are not yet generated. Current coverage is a time fraction.
7. The twelve contracts are operationally parameterized; a richer set of bespoke mission mechanics is specified in the target catalogue.
8. No multiplayer, custom sandbox, research economy, design comparison library, undo/redo or online leaderboard is currently implemented.
9. Operations refresh passed live checks on 2 November 2026 for paused/manual-command and pending-incident state. Speed returns to 1x after refresh.
10. Measure final runtime performance on the user's presentation laptop. No 60 FPS claim is made.
11. Several existing files use dense one-line formatting. A formatting attempt did not run because `npx` was unavailable; do not assume a formatter was installed.

## Prompt 01 verification — 2 November 2026

Completed live Flood Watch success and a deliberate Wildfire early-end failure. Shared award gate rejects missing/failed objectives and incomplete windows; End now is a failed early termination. Evidence missing-image fallback and command-help restoration were added. Original browser suites passed (15 engine, 33 state, 23 events); new evidence browser checks passed 10/10; pure campaign checks passed 86 and completion checks 31. Full evidence remains in BUILD_PROGRESS.md. Model additions were inventoried only; see docs/ADDITIONAL_MATERIALS_REVIEW.md.

## Local source inspection — Prompt 02

A separate development page, `asset-library.html`, offers fifteen on-demand image/GLB previews backed by `data/content/source-registry.json`. It is outside the player menu and does not change campaign state or runtime models. Exact source identities, declared provenance, availability, conversion requirements and review decisions are recorded for 45 references. All nine archive hashes and 4,959 file lengths were checked. Six Star System models and three additional-folder models rendered with local resources. Details and limits: `docs/CONTENT_DECISIONS.md` and `docs/ASSET_PREVIEW_RESULTS.md`. New reference models have not been approved for runtime distribution.

## Schema-2 foundation and material repair — 2 November 2026

Prompt 03 is implemented: `js/contracts/` defines units, validators, compatibility adapters and serializable seeded mission runs with ordered commands. Campaign authoring moved to `data/campaign-contracts.json` with a generated synchronous adapter. Invalid imports do not replace current state; old v1 designs/star-only records migrate. Every part/instrument has explicit units and a visual ID. See `docs/DATA_CONTRACTS.md` for the canonical fields, balance assumptions and legacy-load behavior.

Spacecraft now use a shared original analytic PBR finish in builder/flight views; local previews can switch between enhanced and source appearance. An original articulated catch-arm tower replaces the defective thin-rail model only in enhanced inspector preview. It is an illustration, not a physical catch simulator. See `docs/VISUAL_MATERIALS.md`.

## User-directed scene repair and Prompt 04 — 2 November 2026

The player spacecraft uses connected original hinge-root solar wings with native 2K blue-cell textures; floating transformed source pieces are no longer used. Launch vehicles include protective fairings and stage separation. The site now includes roads, grass, vegetation, buildings and two standby launchers; geometry is batched/instanced. The actual spacecraft, camera and renderer continue through deployment and into operations, with a smooth pullback and six displayed passes; no replacement polar spacecraft shot or black cut. Cinematic geometry remains illustrative. Details: docs/SCENE_REPAIRS.md.

Campaign now has an expandable historical-context chart/table, loaded on demand. Four supplied CSVs contain 276 records across 1957–2025. Publisher/definitions remain unverified; 2025 is partial through a filename-derived 2 October cutoff. Seventy cross-series comparison flags are disclosed; raw values are preserved and excluded from scoring/operational collision prediction. Details: docs/HISTORICAL_DATA.md.
