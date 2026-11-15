# Flight and game review — 8 November 2026

The browser game in `F:/space-mission-gaame_v_0.3` was reviewed against the user's launch/altitude complaints and the camera interaction reference in `F:/ORBITAL-Unity`. The Unity project was read only.

## Changes

- New numerical launches default to 1× real time instead of 16×. Explicitly selected acceleration and paused checkpoints remain resumable. The HUD states the active time rate.
- Altitude below 1 km is displayed in metres. Air-relative speed is shown instead of inertial speed on the launch HUD, so Earth rotation no longer looks like rocket motion on the pad. Predictions still use inertial state vectors.
- Orbit map during ascent shows the instantaneous unpowered trajectory, target altitude, apoapsis, periapsis, and whether the trajectory intersects Earth or the atmosphere. Prediction stops at Earth's surface. The map is an orbital-plane projection at true distance scale and explicitly excludes drag/future thrust.
- Pointer dragging rotates the launch/continued-orbit camera; scrolling zooms with bounds; Reset view restores framing. Camera motion does not affect flight state. Ground clearance is enforced during ascent.
- The globe is present underneath local terrain throughout ascent, removing the all-or-nothing globe swap at 2 km. Local launch-site geometry remains visible farther into ascent.
- Mobile launch rendering occupies the space between the header and instruments. The map button no longer overlaps the launch actions. Canvas sizing is cleared on the continuous operations handoff.
- Folded payload art is fitted against the actual tapered fairing mesh before flight. Build-in animation is completed before measuring. This reconciles differing art scales; engineering mass/capacity checks remain separate.
- Large-bus legacy instrument mounts now use the height of the side body rather than the taller payload turret, fixing mounts above the side panel.
- The 16 planetary/interplanetary transfer missions now use the numerical Earth launch before cruise. Failure prevents cruise. Their existing transfer/cruise model remains approximate.
- Legacy presentation routes no longer label animation height as kilometres or animation seconds as mission elapsed time.

## Verified

Four preset launchers with a 210 kg payload: at five seconds after release, altitude is 39–96 m; crossing 100 km occurs about 191–256 seconds after simulation start; target-orbit insertion about 756–853 seconds. The three-second prelaunch interval is included in those simulation times. These are the game's authored vehicle models, not real vehicle specifications.

Existing suites passed: program, campaign-operations, orbital-geometry, orbital-operations, physics-audit, flight-completion, flight-continuity, contracts, workshop, shared-launch-motion, scene-geometry, deployment-framing, snapshot-render-epoch, lagrange, stage-06-regressions, mission-flow-acceptance, historical-context, ui-performance-failure. Three.js Node suites use `--experimental-loader ./tests/three-loader.mjs`.

Additional suites: numerical-ascent, trajectory-preview, transfer-ascent, flight-camera-input. Coverage includes every preset launcher's timing, surface-clipped prediction, orbit classification, all 16 reference transfer stacks, camera zoom/drag/reset/cleanup, and existing numerical staging/convergence/momentum checks.

Browser playthroughs passed:
- `numerical-ascent-browser.test.mjs`: Condor and custom Courier from preparation through insertion and live operations, including reload and mobile inspection.
- `program-browser.test.mjs`: eight Academy lessons, custom Mars ascent and cruise, pause/reload, correction, data delivery, rewards, and Earth operations.
- `flight-review-browser.test.mjs`: real pointer drag, reset, map rendering, mobile control separation, full mobile numerical insertion, and continuous operations handoff.

Screenshots are in `artifacts/flight-overhaul/after/`, especially `review-pad.png`, `review-drag-camera.png`, `review-mobile-flight.png`, and `review-suborbital-map.png`.

Two stale scene-test expectations were corrected: a native 2K texture requirement after the existing shared 1K optimization, and a bounding-box mount check that included protruding radiator fins. The replacement mount check raycasts the actual structural skin; it then exposed the large-bus mount defect, which was fixed. The full scene-repairs suite passes 3,082 assertions; Stage 06 passes 222.

## Remaining scope

Five old destination profiles (m2/GEO, m3/lunar, mapping/lunar, relay/lunar, observatory/Lagrange) and resumed pre-numerical checkpoints still use explicitly labelled illustrative sequences. They do not yet have integrated powered transfers from the pad to their final destinations. The Academy also retains guided illustrative training sequences. This review does not claim a complete high-fidelity replacement for these systems.

The new orbit map is a two-body coast prediction, not maneuver planning or manual flight guidance. Art scales and educational preset specifications are simplified. Hardware frame-rate captures varied under concurrent browser testing and should not be treated as a controlled performance benchmark. Original user saves were not reset; browser verification used isolated temporary profiles.

