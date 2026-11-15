# ORBITAL — Space Mission Design Game

Double-click **Start-Game.cmd** on Windows. It starts a local-only server, normally at http://127.0.0.1:8785, and opens the game. Keep the server window open while playing. The launcher checks this build's identity before reusing a running server and selects another port if necessary. Opening index.html directly does not work because browsers restrict module and JSON loading from file URLs.

Open the **Campaign Atlas** for 28 contracts across the Earth neighbourhood, Solar System and nearby stars. Core missions unlock later chapters. Side missions can be played independently when their prerequisites are met. **Flight Academy / Help** offers eight resumable lessons with a separate training spacecraft and launcher.

The campaign flow is **Mission → Spacecraft → Launcher → Flight plan → Review → Launch**. Use a spacecraft preset or build one in Satellite Workshop. Rocket Workshop saves two-stage launchers in My Rockets for reuse. In Earth operations you can switch between Inertial, Follow spacecraft and Earth-fixed views. During a transfer, choose a departure opportunity and approve the correction, encounter and downlink. The time controls advance simulated power, propellant and communications, including signal travel time.

The game, Three.js, Draco decoder, images, models and videos are local. External source links require internet. Settings contains sound and progress reset. Progress and resumable flight snapshots are saved for this browser and address. A different browser or port has its own save. Existing mission records, wallet unlocks and satellite blueprints use their original storage keys. The atlas includes bundled NASA and ESA imagery, processing labels and credits. APOD is optional and uses a personal NASA API key supplied at fetch time.

## Continue development

For a new AI account, use [docs/SOL_MEDIUM_PROMPT_PACK.md](docs/SOL_MEDIUM_PROMPT_PACK.md): the complete bootstrap, 24-stage coding sequence and model briefs. The nine supplied archives are preserved in `reference-library/`, described in [docs/SOURCE_LIBRARY_GUIDE.md](docs/SOURCE_LIBRARY_GUIDE.md). This local development library is not part of the playable game package. Resume instructions live in [docs/NEXT_SESSION.md](docs/NEXT_SESSION.md).

Start with [docs/START_HERE.md](docs/START_HERE.md). Read [BUILD_PROGRESS.md](BUILD_PROGRESS.md) for verified work, [docs/CURRENT_GAME.md](docs/CURRENT_GAME.md) for implemented logic, and [docs/MASTER_GAME_SPEC.md](docs/MASTER_GAME_SPEC.md) for the target design. [docs/IMPLEMENTATION_PROMPTS.md](docs/IMPLEMENTATION_PROMPTS.md) contains eighteen staged coding prompts and nine model-generation briefs. The target includes substantial features that are not implemented yet.

This remains an educational simulation with fictional vehicle statistics, simplified geometry and guided mission operations. Planetary transfers use approximate Hohmann arcs and local capture estimates. The solar frontier uses a hyperbolic escape model. Proxima Centauri is a speculative beamed-sail flyby at 5% of light speed with an approximately 85-year cruise and a further 4.25 years of signal travel. Gravity assists and powered surface operations are future simulation systems. Online multiplayer, full orbital mechanics, geographic science coverage and multi-launch fleet management are roadmap work. Asset provenance is tracked in [docs/ASSET_AUDIT.md](docs/ASSET_AUDIT.md).

## Checks

Run `node tests/program.test.mjs` for the 28 mission configurations, progression, migration, rewards and API failure cases. Run `node tests/flight-continuity.test.mjs` for the actual deployment handoff and reference frames. With the local server running, `node tests/program-browser.test.mjs` checks the Academy, desktop and mobile navigation, custom Earth and Mars flights, and flight recovery in Chrome. Set `ORBITAL_CHROME` if Chrome is installed elsewhere. Run `node tests/campaign-operations.test.mjs` for the original orbital contracts. Browser suites: `/tests/engine.test.html`, `/tests/state.test.html`, `/tests/events.test.html`, `/tests/characters.test.html`, `/tests/models.test.html`, `/tests/flow.test.html`. The flow suite restores prior saved progress when it finishes. Some browser flow expectations predate the expanded campaign and need migration before they can serve as release gates.

The pre-upgrade source backup is `backups/before-mission-control-20261102-133146.zip`. Older implementation notes remain in PROJECT_STATE.md, BUG_SWEEP.md and GRAPHICS_PASS.md; consult BUILD_PROGRESS.md for newer changes.

## Local asset inspection

With the local server running, open [the development asset library](http://127.0.0.1:8785/asset-library.html) to inspect selected image/GLB references on demand. Source rights, conversion needs and runtime decisions are recorded in `docs/CONTENT_DECISIONS.md`; previews do not approve redistribution. This development page/reference library is separate from playable runtime content.

## Historical context and current visuals

The campaign offers an expandable historical chart/table with explicit supplied-source, cutoff and quality labels. See `docs/HISTORICAL_DATA.md`. Connected solar wings, complete launch stacks/site and continuous deployment are described in `docs/SCENE_REPAIRS.md`. Lunar rendering credits: [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/), LRO LROC/LOLA; exact file hashes are in `textures/moon/manifest.json`.

## Satellite Workshop — 4 November 2026

Choose **Satellite Workshop** from the home screen to build without a mission. It includes four distinct buses, independent component placement and solar wings, named satellite saves, import/export, progression coins and permanent unlocks. The catalogue contains 148 definitions: four buses, twenty choices in each of six engineering categories, and twenty-four payloads. Mission difficulty uses a separate five-star label.

See [the implementation and verification report](docs/SATELLITE_WORKSHOP.md) for migrations, module changes, tests and simulation limits. Run `node tools/verify-workshop-tests.mjs` for focused pure checks, and `node tools/workshop-cdp.mjs` against the local server for browser checks. Saves belong to this browser and address, including port; export JSON for portable backups.

## Visual and physics review

The updated flight-deck UI, labelled maps and shared Earth lighting are documented in [the realism and Space Apps audit](docs/REALISM_AND_SPACE_APPS_AUDIT.md). It distinguishes verified physics, fixed minor bugs, major simulator limitations and unresolved submission requirements. Run `node tests/physics-audit.test.mjs` for the new conservation and transfer checks.

## Flight review — 8 November 2026

Numerical launches now start at real time, show metre-scale early altitude, and offer a live coast trajectory map plus drag/zoom cameras. Planetary transfer missions use numerical launch before cruise. See [the flight and game review](docs/FLIGHT_GAME_REVIEW_20261108.md) for fixes, verification, and remaining illustrative destination profiles.
