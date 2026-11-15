# ORBITAL browser flight overhaul

Run [Start-Game.cmd](../Start-Game.cmd) and leave the local server window open. Use the same browser and address for existing progress. For the boosted example, select **Night watch → Load preset → Continue to launcher → Atlas V → LEO**. For a custom launch, select **Flood watch → Load preset → Continue to launcher → Rocket Workshop → Load reference vehicle → Use launcher → LEO**. Follow Flight Plan and Review to Launch. The campaign still applies mission prerequisites. During ascent, use 1× to watch liftoff or a separation, then increase the visible time rate for the longer burn. **Advance flight** resolves the numerical flight to its outcome. **Enable effects** starts audio from a user gesture.

The workspace had no Git metadata. [Targeted source backup and SHA-256 manifest](../backups/flight-overhaul-20261107/SHA256.txt) cover the edited existing files. The Unity project was inspected through source, its asset manifest and its verified Windows playtest captures. No native player profile was opened and no Unity files were edited.

## Baseline and acceptance matrix

| Reproduction | Subsystem and cause | Target behavior and evidence |
| --- | --- | --- |
| Commit to a Condor launch and watch the climb | Launch timeline generated 100 km from a fixed 18-second easing curve. Velocity and pitch were presentation values. | Integrate a guided climb and determine success from a bound orbit. Fresh Condor launch capture, browser reload test and numerical convergence check. |
| Fly a custom Courier two-stage build | The same fixed thresholds controlled stage meshes and did not track tank mass or engine state. | Detach only burned-out assemblies. Validate event order, attached mass and nozzle state. Fresh Courier core video, orbit screenshot and numerical mass assertions. |
| Observe release, then reload during coast | Legacy deployment interpolated from the last cinematic camera into preset elements. | Pass numerical insertion into the coast, apply a paired payload release impulse and start operations from the propagated payload orbit. Browser test checks saved orbit equality. |
| Inspect both workshops and scroll across the default kit | The spacecraft had a 3D room. The rocket workshop rendered a CSS silhouette. | Retain selection and libraries, add a 3D integration bay and confirm the viewed stack. Courier and spacecraft screenshots. Largest and smallest supported assemblies still need a dedicated visual pass. |
| Navigate Moon and Mars cruises | Existing two-body arc already advanced a marker but showed an arrival pin and hid flown history. Braking was a guided resource calculation. | Display the target reference at the same coast time, distinguish plan and flown history, and expose trim, braking and time to encounter. A continuous SOI and capture model is still required. |
| Inspect the Earth atlas and Solar System | Earth–Moon points were hard-coded and the Solar System used a single schematic view. | Solve the two rotating frames, zoom into Sun–Earth L1/L2, and disclose distance scales. Independent force-balance and reference distance tests. |
| Enable sound and pause or change screens | Speech and video were separate from engine state. | Gesture-start procedural effects, persist mixer settings, silence pause and close the launch context at navigation. Browser signal check is distinct from listening. |

The baseline browser suite ran against the original source in an isolated Chrome profile. It exercised the Academy, campaign navigation, a guided Mars flight and a custom Earth flight. [Baseline screenshots](../artifacts/flight-overhaul/baseline) include the atlas, old rocket workshop, Earth operations and the transfer display. The baseline did not record launch or separation videos.

## Architecture and model

- New campaign **LEO and SSO** launches use [ascent.js](../js/engine/ascent.js). Existing cinematic checkpoints continue on their original path. Academy, GEO, legacy lunar/deep-space operations and transfer missions retain their prior launch paths.
- Inertial coordinates are right-handed with +Z north, the equator in XY and +X the zero-meridian direction at scenario epoch. Earth-fixed coordinates rotate around +Z at the sidereal rate. The fictional equatorial launch site rotates with Earth. East is the cross product of +Z and local up. Inertial release includes that velocity. The ascent display projects ECI into a fixed launch frame with the intended downrange direction along its +X axis and local up along +Y at release. It subtracts the current vehicle position before passing coordinates to the renderer.
- Simulation uses SI, double-precision JS numbers, point-mass midpoint integration at 0.2 s with shortened propellant boundaries, spherical gravity, a 7.6 km exponential atmosphere, and constant drag coefficient 0.36 against rotating air. Preset performance is authored for the existing schematic stacks. Custom propulsion and tank parameters come from the catalogue. Dry mass plus remaining attached propellant determines the displayed stack mass. The guidance commands pitch above the local horizon, limited to 2.2°/s and 1.7°/s², with a plane feedback term. It models neither rigid-body dynamics nor thrust vector actuation. Above the pad the control law can command steep braking pitch as it settles near target altitude.
- Insertion requires a bound orbit within a periapsis/apoapsis band and 2° of target inclination. The altitude band is the larger of ±45 km and ±15%. The supported design target is near-circular from 150 to 1,000 km. Some allowed workshop combinations lack sufficient performance on the numerical trajectory. For example, the Courier with 210 kg falls short of the 700 km retrograde target, while the Condor reaches it. Existing engineering gates still use their catalogue delta-v allowances.
- Solver events identify tank exhaustion, booster and core releases, fairing release and insertion. The camera and HUD sample the same clock. The game stores a versioned clock checkpoint and reconstructs the deterministic trajectory from the frozen run design. A pause, camera change or playback rate changes viewing time, independent of the integration. Detached visuals inherit release velocity plus estimated rotational velocity and evolve with local gravity for a short display window. Symmetric lateral kicks are authored. Released debris is not tracked through reentry. The simulation uses coincident point masses for impulses while the renderer retains model attachment offsets.
- The payload and upper stage receive equal and opposite momentum changes during release. Each follows its own two-body orbit through deployment. Operations uses the achieved payload elements and Earth spin epoch. The live handoff retains the spacecraft, canvas and physical follow view. Overview uses an enlarged position marker. The resumed operations renderer uses the existing overview and follow presentation with the achieved elements.
- Moon and Mars transfer displays use a circular moving target reference and the existing Kepler coast. Their local capture requirements, finite propellant and command gating remain educational estimates. The plan marker and flown path show the same nominal arc. Omitting correction still fails at encounter through the existing guided state machine.
- Launch effects are seeded procedural Web Audio. This adds launch ambience, sustained filtered thrust and ignition/separation transients, attenuated in the external view as the craft leaves the lower atmosphere. The mixer controls procedural effects. Speech remains under its existing settings.

## Unity reference adaptations

| Observed in verified Unity captures or source | Browser adaptation | Verification |
| --- | --- | --- |
| Numerical track and compact flight instruments | SI launch telemetry and attained orbit feed the existing campaign and a denser operations layout. Retained the browser rocket meshes. | Numerical and live-browser tests, Condor and Courier operations captures. |
| Workshop paneled ribs, grid and mounted craft | Strengthened spacecraft clean-room walls and introduced a tall launcher bay with rail lights, service levels and a work stand. | Browser screenshots of the campaign spacecraft and the Courier. |
| Propulsion and staging inspector alongside the viewport | The existing launcher engineering panel now accompanies an orbitable 3D preview with part visibility driven by the draft. | Campaign browser path loaded, saved and flew the same custom blueprint. |

[Unity Windows playtest record](../../ORBITAL-Unity/Verification/Floodwatch/README.md) documents the reference build. Its synchronized boosters and limited campaign scope were not used as acceptance criteria. [JPL DE440 gravitational parameters](https://ssd.jpl.nasa.gov/astro_par.html) are used by the equilibrium calculations.

## Reproduction and evidence

```powershell
node tests/numerical-ascent.test.mjs
node tests/lagrange.test.mjs
node tests/program.test.mjs
node tools/verify-workshop-tests.mjs
node --experimental-loader ./tests/three-loader.mjs tests/shared-launch-motion.test.mjs
node --experimental-loader ./tests/three-loader.mjs tests/flight-continuity.test.mjs
node --experimental-loader ./tests/three-loader.mjs tests/physics-audit.test.mjs
node --experimental-loader ./tests/three-loader.mjs tests/orbital-geometry.test.mjs
node --experimental-loader ./tests/three-loader.mjs tests/scene-geometry.test.mjs
node --experimental-loader ./tests/three-loader.mjs tests/deployment-framing.test.mjs
node tests/numerical-ascent-browser.test.mjs
node tests/program-browser.test.mjs
```

Browser suites require the game server at `http://127.0.0.1:8785` and Chrome. Set `ORBITAL_TEST_URL` for another port and `ORBITAL_CHROME` if needed. Tests use temporary browser profiles. The ascent suite records a 1280 × 720 scene on the available GPU. The general program suite uses software rendering and its captures are enabled with `ORBITAL_TEST_ARTIFACTS`.

- [Condor liftoff and booster separation video](../artifacts/flight-overhaul/after/condor-liftoff-and-boosters.webm)
- [Courier ascent and core separation video](../artifacts/flight-overhaul/after/courier-liftoff-and-core.webm)
- [Condor pad](../artifacts/flight-overhaul/after/condor-pad.png), [booster release](../artifacts/flight-overhaul/after/condor-boosters.png), [core release](../artifacts/flight-overhaul/after/condor-core.png), [deployment](../artifacts/flight-overhaul/after/condor-deployment.png) and [operations](../artifacts/flight-overhaul/after/condor-operations.png)
- [Rocket workshop](../artifacts/flight-overhaul/after/rocket-bay.png), [spacecraft workshop](../artifacts/flight-overhaul/after/spacecraft-bay.png), [Sun–Earth map](../artifacts/flight-overhaul/after/sun-earth-atlas.png), [Solar System distances](../artifacts/flight-overhaul/after/solar-distance-atlas.png) and [Mars transfer](../artifacts/flight-overhaul/after/program-transfer.png)
- [Ascent browser run log](../artifacts/flight-overhaul/numerical-browser.txt), [campaign browser run log](../artifacts/flight-overhaul/program-browser.txt) and [numerical and regression run log](../artifacts/flight-overhaul/pure-tests.txt)

Numerical verification covers ordered staging, propellant/mass, weak thrust, exhausted upper-stage fuel, out-of-envelope inputs, 0.2 s versus 0.1 s convergence, orbital energy, frame round trips, 24/30/60 fps playback sampling, and payload separation momentum. The browser run exercises both vehicles from the campaign through operations, including reload while paused after Condor booster separation. Existing legacy trajectory and deployment checks remain in place because the legacy path remains reachable.

For the 210 kg numerical fixtures, Condor inserted at 780.24 s and Courier at 772.24 s. The halved step changed insertion time by 0.10 s and 0.20 s, respectively. Across both fixtures the periapsis change was under 292 m and the apoapsis change under 180 m. These are convergence results for the educational model.

The guided Lunar Capture and Mars Orbiter checkpoint tests verify both successful resource accounting and a failed capture when the braking tank is empty. Those tests exercise the legacy capture calculation.

### Measured browser performance

Chrome at 1280 × 720, pixel ratio 1, Intel Core i5-1135G7 and Iris Xe via ANGLE D3D11, approximately 8 GB system RAM. Standard adaptive rendering and 512 px launch shadow maps. Each sample contains 72 animation frame intervals. The pad sample includes canvas recording. The operations sample was paused after handoff.

| Scene | Median | P95 | P99 | JS heap snapshot |
| --- | ---: | ---: | ---: | ---: |
| Pad and early climb | 16.7 ms | 33.4 ms | 34.5 ms | 29.7 MB |
| Earth operations | 16.6 ms | 16.8 ms | 17.0 ms | 24.2 MB |

These are frame intervals and point-in-time JS heap measurements. The pad slightly exceeded the 33.3 ms target at P95. GPU allocation and long-run leak behavior were not measured. The browser also verified a running AudioContext with an RMS signal of about 0.040 after a trusted gesture and mute persisted after reload. The recordings are canvas video and have no audio track.

## Remaining acceptance work

Continuous Earth departure from the attained parking state, lunar and planetary SOI transitions, geometry-based correction, propagated capture and visual arrival are still open. GEO, lunar and deep-space departures and the Academy continue to use the older launch presentation. A dedicated test of failed capture and save recovery on a numerical patched trajectory is pending that model. Exhaust and detached parts are simplified. Full verification of pad clearance for every launcher, largest/smallest workshop builds, mobile play beyond targeted captures, long-running GPU memory, scene-cycle resource usage and manual listening remains open. The nearby-star and interstellar entries were outside the overhaul.
