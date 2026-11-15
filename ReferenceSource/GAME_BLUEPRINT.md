# ORBITAL — Mission Control

## Product direction

A cinematic, offline-first space engineering game. The player runs a young mission agency: accept a contract, build a spacecraft, select an orbit and launch vehicle, launch it, operate it under pressure, and use the flight evidence to improve the next design.

The experience must earn its spectacle: the spacecraft on the launch vehicle and in orbit is the spacecraft the player built. Resource displays describe real simulation state. Every mission has measurable objectives beyond a score. Educational simplifications are identified, not disguised as flight-qualified predictions.

Challenge: https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/?tab=details
The supplied challenge text is the requirements baseline. The official details URL was inaccessible through the browsing tool on 2 November; exact local judging weights and submission cutoff remain unverified. The user supplied 14 November as the deadline.

## Visual direction

- Near-black space, warm ivory typography, electric cyan telemetry, amber commands, restrained red alerts.
- Large Earth limb, directional sunlight, visible atmosphere, quiet starfield, spacecraft silhouettes and fine orbit lines. Avoid a wall of glowing blue boxes.
- Mission control has a permanent identity: small ORBITAL wordmark, mission number, destination, phase and elapsed time. Large typography belongs to mission names; numerical telemetry uses tabular figures.
- Campaign: full-width editorial header, three chapter filters, mission cards with photographs or procedural orbital diagrams, a selected contract briefing.
- Builder: spacecraft remains the visual centre; catalogue and live engineering margins support it. Starter designs are editable, never the only solution.
- Launch: retain supplied staged models, add telemetry and timeline. Camera movement should be deliberate and smooth; show ascent, separation, deployment and orbit acquisition. Never let a loading model create an unexplained frozen screen.
- Operations: Earth/Moon and the actual assembly occupy the centre, instruments and mission objectives flank it, commands and time controls occupy the bottom, telemetry history runs across the lower edge.
- Report: large mission outcome, three concrete objective results, operations timeline, resource bottleneck, replay and redesign actions.

## Pacing targets

- First meaningful choice in under 30 seconds after the menu loads.
- Optional short training; campaign is directly accessible.
- Starter blueprint gets a beginner to an editable spacecraft immediately.
- Standard mission target: 6–10 minutes including design, launch and operations.
- Operations have pause, 1x/2x/4x and an explicitly labelled autopilot.
- Decisions pause the clock; no reading penalty.
- Voice and long explanations are optional; no dialogue gate blocks interaction.
- Launch remains skippable. Skipping a cinematic does not invent a successful outcome.

## Campaign target: twelve distinct contracts

| Mission | Core problem | Player decision | Visible outcome |
|---|---|---|---|
| Flood watch | Useful observations under a limited budget | Balance payload with downlink | Survey coverage and delivered data |
| Wildfire sentinel | Heat observation and power use | Observe aggressively or conserve energy | Thermal survey completion |
| Ocean pulse | Repeated observations and storage | Schedule collection around contacts | Delivered ocean measurements |
| Ice frontier | Polar surveying and eclipses | Battery capacity versus payload | Ice survey coverage |
| Remote links | Reliable communications | Service duty cycle and reserves | Link availability |
| Storm tracker | Rapid observations | Data production versus radio capacity | Timely weather measurements |
| Night watch | Long observations, limited energy | Reserve power for the dark pass | Night survey completion |
| Solar guardian | Radiation and safe-mode recovery | Protect systems or continue observing | Science retained after incident |
| Moon ice hunt | Lunar science and insertion fuel | Payload relevance, pointing and reserves | Lunar survey result |
| Lunar cartographer | Precision mapping | Pointing equipment versus payload capacity | Mapping and data return |
| Far-side relay | Intermittent links | Store, forward and preserve energy | Relay availability |
| Deep-space observatory | Weak downlink and long operations | High-value observations versus transmission | Returned science and survival |

Earth missions and communications missions share simulation primitives but have different objective thresholds, environmental profiles, payload relevance, and incident schedules. Do not call a mission complete just because its card exists. Every shipped contract needs a viable design and a tested success and failure path.

## Simulation contract

Keep the engineering evaluator pure and deterministic. Extend operations with fixed time steps, explicit units and serializable state: elapsed simulated minutes, battery Wh, data GB, collected and delivered science, coverage, service uptime, propellant, thermal stress, decisions and events. Renderer time never determines scientific outcomes. Pause and simulation speed must not change the result for the same command schedule.

Observation consumes power and generates data. Solar generation depends on illumination. Downlink consumes power and transmits only during contact. Storage saturation loses new data, not already delivered science. Safe mode reduces load and collection. Propulsion decisions consume finite propellant. Incident options have explicit costs and effects. Hardware installed in the builder determines operational capacities.

Autopilot is a legitimate accessibility option: it selects safe operational modes and leaves incident decisions to the player. A player can disable it to schedule manually. It must not award fabricated mission completion.

Scientific scope: simplified educational orbit/contact cycles, not an ephemeris or trajectory optimizer. Existing launcher performance values are scaled scenario values, not real vehicle specifications. Satellite assembly is visual abstraction. Live imagery and external datasets are not claimed unless actually connected and cited.

## Scoring

Mission objectives are a separate pass/fail gate. Cost savings cannot compensate for never delivering the required service or observations. Engineering, science and budget stars describe quality after that gate. Report both design predictions and the actual flight. Keep original save records compatible. Do not overwrite a higher previous rating with a lower replay.

## Launch roadmap

Immediately use supplied Falcon 9, Atlas V and Ares I visual families. Select different destination profiles: LEO, polar, transfer, lunar and distant observatory. Give profiles different captions and mission context while explicitly retaining a compressed presentation timeline. Future work: separately named fairings, boosters, launch tower arms, physical stage separation and vehicle-specific burn timelines. Do not label a recycled model as a faithful new rocket.

## Team play and replay

Shared-device four-role review: director, spacecraft engineer, science lead and operations lead. Each role has a visible checklist. Network rooms are a later scope item requiring synchronization and reconnect testing; never show them as implemented until they work. Replay contracts with the same seed to compare engineering choices. Future sandbox supports custom budgets, instruments and destinations.

## Implementation sequence

1. Preserve source backup; inspect existing state, routing, graphics and engineering rules.
2. Add campaign metadata and shared unlock checks; validate all twelve missions.
3. Create the ORBITAL menu and campaign presentation with clear navigation and optional training.
4. Add editable starter designs and concise mission briefings.
5. Implement and test the pure operations simulator.
6. Integrate active operations, commands, telemetry charts and persistent progress.
7. Feed actual operations outcomes into reports and mission progression.
8. Improve Earth/space presentation and destination-appropriate operations scenes.
9. Add launch telemetry and speed controls without breaking skip/failure paths.
10. Test original engineering rules, campaign viability, simulations, refresh and live browser flow.
11. Document implemented versus planned features and prepare the next build prompts.

## User-provided model specification

Generate one sample before a large batch. Deliver self-contained GLB with embedded textures, Y-up orientation, metre-based scale, named objects, clean normals and usage/license notes. Prefer 1K–2K PBR textures and approximately 5k–20k triangles per ordinary component. Moving pieces must be separate meshes; a single fused AI mesh cannot articulate. Avoid labels and baked lighting. Preserve original files; optimize runtime copies separately.

Priority A: medium satellite bus; optical camera; radar payload; hinged left/right solar wings; dish with separate gimbal.
Priority B: lunar spectrometer; neutron detector; relay payload; high-gain antenna.
Priority C: matching rocket fairing halves; payload adapter; launch tower swing arms.
We already have launch vehicles and scenery; do not spend the first asset budget replacing everything.

## Acceptance and demonstration

- Menu and campaign render with useful controls even if a 3D asset fails.
- Twelve contracts are represented; locked content explains its prerequisite.
- Each accessible mission has at least one starter design passing its launch gate.
- Observe, downlink and safe mode change telemetry and mission outcome.
- Pause truly pauses; changing speed changes presentation duration only.
- A failed mission remains failed in the report and does not unlock content.
- Refresh retains completed missions and the current operations state.
- No external CDN is required to play.
- Verify keyboard navigation and a small viewport; respect reduced motion.
- Demo: select Flood Watch, change one payload, see resource consequences, launch, handle an incident, compare delivered result with objective, redesign.

## Next-stage build prompts

Paste one prompt at a time into this project. Each prompt requests implementation and validation, not another proposal.

### Prompt 1 — audit the delivered upgrade

Read GAME_BLUEPRINT.md, BUILD_PROGRESS.md and the current source. Play the current ORBITAL build and run the existing and new tests. Identify the three highest-impact actual defects, reproduce them, fix them without discarding working features, and update BUILD_PROGRESS.md with evidence. Preserve saves and source assets. Do not pad line count or claim untested results.

### Prompt 2 — make every campaign mission distinct

Implement mission-specific operational objectives for all twelve contracts in GAME_BLUEPRINT.md. Give each a unique combination of instrument relevance, observation timing, illumination/contact profile and two consequential incidents. Show the objective visually, explain why it matters, and provide a viable editable starter design. Test all missions on normal difficulty and at least one failure path per mission. Reuse shared simulation primitives; do not copy twelve engines.

### Prompt 3 — cinematic launch overhaul

Inspect supplied GLBs and their named mechanical parts before modifying the launch renderer. Implement vehicle-appropriate stage/fairing separation where the geometry supports it, smooth camera cuts, atmospheric scattering approximation, scaled exhaust and smoke, dynamic sunlight and legible launch telemetry. Add destination-specific transfer captions. Preserve skip, pause, failures, reduced motion and WebGL disposal. Label fictional/scaled performance honestly. Benchmark on the available browser; document missing model nodes.

### Prompt 4 — spacecraft engineering workbench

Upgrade the builder into a clean spacecraft assembly workspace. Keep the actual craft large and visible. Add component preview, compatible attachment slots, before/after engineering deltas, undo/redo and two saved designs for comparison. Explain mass, power, battery, downlink and lifetime consequences in plain language. Preserve tutorial goals and keyboard accessibility. Validate that the assembly and engine use the same installed parts.

### Prompt 5 — mission control depth

Expand the existing fixed-step operations simulator with observation schedules, ground-contact scheduling, finite onboard storage, time-tagged useful data, energy-aware safe mode, fuel-consuming maneuvers and recoverable faults. Add clear forecast indicators and commands with visible costs. Keep seed replay deterministic and persist simulation state. Test conservation, contact/eclipses, pause/speed equivalence, storage overflow and recovery; do not substitute a scripted progress bar.

### Prompt 6 — scientific credibility pass

Audit every educational claim and model assumption against NASA/ESA or other primary references. Cite exact sources in an in-game accessible sources panel. Distinguish scaled gameplay values, simplified models and sourced observations. Correct radiation, eclipse, orbit, pointing, launch capacity and communications explanations. Add optional explanations with diagrams. Do not imply live NASA data or real trajectory accuracy unless implemented and verified.

### Prompt 7 — cooperative mission room

Build shared-device cooperative play for one to four participants with director, engineering, science and operations roles, role-specific checklists, a shared prelaunch review and recorded decisions. Solo mode must remain fully playable. If network play is also requested, first implement an authoritative room state, conflict handling and reconnect tests; do not present shared-device play as online multiplayer.

### Prompt 8 — asset integration

Inspect the newly supplied models, report dimensions, material/texture costs and whether moving parts are separate. Copy originals into a source folder and create optimized runtime copies. Integrate into existing spacecraft/rocket identities with consistent scale, lighting and mounting pivots. Do not replace simulation statistics with visual guesses. Verify missing-file fallback, slow load, disposal and actual browser appearance.

### Prompt 9 — faster onboarding and accessibility

Observe three first-time play sessions or use the supplied feedback. Reduce time to the first meaningful choice, eliminate repeated compulsory dialogue and keep technical explanations optional. Add legible statuses, keyboard operation, focus management, reduced motion, sound controls, responsive layouts and useful loading feedback. Never remove engineering decisions merely to shorten a flow. Verify training and direct campaign entry.

### Prompt 10 — replay and campaign longevity

Add a seed-based contract generator using validated mission templates, custom sandbox budgets, design export/import with schema validation, personal records and same-seed comparison. Separate generated contracts from authored campaign milestones. Ensure imported designs cannot bypass unlocks or corrupt progress. Include a replay summary explaining which changed decisions caused a different result.

### Prompt 11 — final validation and performance

Run campaign success/failure paths, original rule tests, save migration, refresh during flight, repeated 3D screen navigation, missing-asset fallback and mobile/desktop layout checks. Measure startup size, render frame time and resource cleanup on the actual available hardware. Fix failures, then freeze features. Record exact remaining limitations instead of claiming a guaranteed frame rate or competition readiness.

### Prompt 12 — competition package

Using the verified official submission requirements, prepare a concise project description, architecture diagram, source/asset credits, a three-minute demonstration script and a backup walkthrough recording plan. Explain the challenge fit with evidence from actual gameplay, educational outcomes and engineering trade-offs. Clearly distinguish implemented features from roadmap. Prepare local artifacts; do not submit or publish without the user's instruction.

## AI model-generation prompts

Common suffix: Game-ready GLB, embedded PBR textures, metre scale, Y-up, clean normals, no text/logos, no scene backdrop, no baked studio lighting. Separate mechanically moving meshes, name all objects, preserve hinge pivots. Supply license/source notes. Aim for 1K–2K textures and moderate polygon count.

- Satellite bus: Compact rectangular Earth-observation satellite bus, approximately 1 metre wide, champagne gold thermal foil on two faces, brushed aluminium mounting frame, dark radiator panel, clean visible attachment areas for solar hinges and a nadir-facing camera. No integrated solar panels or antenna. Common suffix.
- Optical payload: Compact satellite optical camera with a black cylindrical baffle, restrained blue lens coating, aluminium electronics housing and mounting bracket. Aperture faces local negative Y when mounted below the bus. Common suffix.
- Radar payload: Foldable rectangular synthetic-aperture radar panel with three mechanically separate hinged segments, muted dark graphite radiating face and a light aluminium rear truss. No satellite body. Common suffix.
- Solar wing: One satellite solar wing with two separate rectangular hinged sections, dark blue photovoltaic cells, thin metallic frame, root hinge at origin. No spacecraft body. Name root_hinge, panel_inner and panel_outer. Common suffix.
- Antenna: Satellite high-gain parabolic dish with separate reflector, feed and two-axis gimbal, white reflector surface, lightweight rear supports, root mounting origin. Common suffix.
- Lunar payload: Compact scientific spectrometer with a dark optical entrance, gold thermal wrap and aluminium mounting feet, recognizable without tiny surface text. Common suffix.
- Rocket fairings: Matching left and right halves of a smooth white payload fairing for the supplied rocket reference, separate fairing_left and fairing_right meshes, thickness at edges, clean interior, attachment pivots near the base. Preserve the reference diameter and silhouette. Common suffix.
