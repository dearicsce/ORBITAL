# Data and simulation contracts — schema 2

Implemented 2 November 2026, Prompt 03. These are contracts for the educational guided prototype, not validated real spacecraft specifications.

## Catalog and units

`data/world1.json` remains the authored part/instrument catalog. Every part and instrument now carries `schemaVersion: 2`, an explicit `visualId`, a `units` declaration and an authored-balance label. Existing IDs and static launch-gate formulas are unchanged. `js/contracts/world.js` builds an SI `resources` projection from the labelled catalog values: kg, USD, W, J, bit, bit/s and kg of propellant. Do not edit the projection separately from catalog values.

`js/contracts/units.js` centralizes conversions: 1 Wh = 3,600 J; 1 decimal GB = 8,000,000,000 bit; one day = 86,400 s; kelvin/°C and radians/degrees are explicit. Nonfinite input and overflowing conversions are rejected. The existing guided engine continues to expose named Wh/GB/W/minute fields through this compatibility boundary; it has not been relabelled as an SI physical solver.

The nine additional campaign definitions and original mission metadata patches now live in `data/campaign-contracts.json`. `tools/sync-contracts.mjs` generates the synchronous ES-module adapter `js/campaignContent.js`, allowing both browser and Node consumers to use the same content without JSON-module support or an asynchronous API change. Contract tests compare adapter content with its JSON source. All twelve campaign contracts plus training validate; prerequisite cycles and invalid references are rejected.

## Recorder and radio

Recorder capacity is an independent `recorderCapacityGb` field on the current integrated avionics package: Basic 8 GB, Advanced 24 GB, Rad-hard 12 GB. These values preserve the previous baseline capacities but are no longer calculated from processor throughput. Changing `maxDataGbDay` does not change storage capacity. Separate recorder hardware is a later workbench extension.

Radios have `transmitPowerW` equal to their existing conservative draw, and `standbyPowerW` set to 25% of it. These are declared game-balance assumptions, not measured hardware ratings. Static engineering review still budgets full radio power. New operational runs remove radio power from generic bus load, then add standby load while observing/safe and transmit load while downlinking or providing relay service. Flood Watch observe load therefore changes from 115 W to 85 W; transmit load excludes payload power. Mission targets, prices, masses and star thresholds were not reduced to make tests pass.

Old active flights retain their saved hardware loads and recorder capacity. Missing legacy radio-mode fields mean zero additional radio load because the old base already included it. Thus refresh does not silently change an ongoing flight's resource model.

## State and import

Progress uses the existing `space_mission_game_state_v1` storage key with `schemaVersion: 2` in its payload. The old design shape remains valid and upgrades through `migrateDesign`; component selections, IDs and star-only historical records are retained. New completed records include mission ID, record schema and scoring version. Historical scores are not recalculated.

`validateWorld`, `validatePart`, `migrateDesign`, `validateProgress` and `validateFlightRecord` live in `js/contracts/validate.js`. They reject unsupported versions, unknown IDs, invalid part categories, nonfinite values, invalid quantities, payload-slot overflow, malformed settings and unsafe object keys. UI partial edits allow temporary slot mismatch while the existing builder/sanitizer updates the assembly; full imports enforce slot limits.

`importProgress(payload, data)` returns `{ok, state}` or `{ok:false, error}`. It validates the complete candidate before changing in-memory state and never writes storage. Call `saveProgress` explicitly only after success. `loadProgress` also validates before replacement. The state test page now restores its original browser save after the suite finishes.

## Mission-run envelope and commands

`js/contracts/missionRun.js` owns schema-2 runs, containing blueprint/mission snapshots, evaluation, launch result, original event results, phase, `timeStepSec:270`, simulation/scoring version, initial seed/current seed state, command history, next sequence and operational engine state. New launch/event random draws use a saved xorshift32 stream. A fresh run receives a seed once; normal operational incidents remain deterministic by their authored ticks. Loading never repeats a launch draw. Legacy sessions receive migration metadata without rerolling results.

Commands are plain JSON: `{schemaVersion:2, sequence, tick, type, ...}`. Types: `mode` with `mode`; `pause` with `paused`; `incident` with `choiceId`; and `end`. `reduceRunCommand` validates and returns a new envelope, so rejected commands cannot partially change resources. Mode changes can be scheduled for a future tick within the window. Other commands apply immediately. Sequences are monotonic; stale/duplicate sequences and impossible fuel responses are rejected. `advanceMissionRun` applies due mode commands in sequence order before the engine tick. Paused/incident/finished state cannot advance.

Mission control now uses this reducer for commands, pause, incidents and early end. The UI copies accepted envelopes back into its current session for compatibility with the existing router/report. `flightSession.js` validates before accepting or importing a flight and rejects invalid bytes/resources without replacing the current run. The operations data equation remains `collected = delivered + stored + lost` within 1e-7 GB; capacity bounds are checked on import.

## Scope and verification

Tests: `node tests/contracts.test.mjs`, `node tests/flight-completion.test.mjs`, `node tests/campaign-operations.test.mjs`. Fixtures cover unit round trips, future versions, invalid IDs/quantities, malformed imports, legacy migration, record preservation, independent recorder capacity, radio loads, seeded hard launches, ordered commands, duplicate/stale command rejection, pause, pending incidents, JSON restoration and data conservation. Browser evidence and exact counts are recorded in BUILD_PROGRESS.md.

The engine still uses profile-based contacts/eclipse, sampled coverage, guided thermal behavior and a shared twelve-mission framework. Observation records, orbital propagation, physical link budgets and richer thermal/power solvers belong to later prompts. This stage establishes validated boundaries while keeping the current game playable.
