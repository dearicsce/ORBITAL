> Latest 2 Nov 2026 update: see [ORBIT_GEOMETRY.md](ORBIT_GEOMETRY.md). New flights use geometric eclipse/contact and shared builder forecasts; playable buses are original modular shells; launch terrain has local 2K CC0 PBR textures. Earlier fixed-fraction/GLB bus descriptions below are historical. Fresh rendered visual acceptance remains pending.

# Spacecraft, launch and lunar scene repair

2 November 2026, requested before Prompt 04.

## Connected solar wings

The extracted source wing retained transformed/disconnected pieces, while normalization and subsequent rotations moved its mounting origin away from the bus. `js/three/solarWing.js` now creates an original wing from an actual hinge origin, with mounting yoke, connected inner/outer framed sections and joint. Its native 2048 × 1024 photovoltaic texture has regular dark-blue cells and conductors, with restrained reflections. It bypasses the previous generic metallic shader that washed the solar surface pale.

`spacecraftParts.js` mounts mirrored wings against the measured bus edges and keeps multiple pairs on separate mounting planes. Opening/folding happens at the hinge; installation no longer scales the hinge away from its mounting face. Geometry/material/texture cloning preserves shared resources within each clone instead of duplicating a texture for every panel face. Parts, quantities and electrical generation remain unchanged.

## Complete launch vehicles and site

`launchVehicle.js` creates complete original educational vehicle visuals with connected lower/upper stages, engine bells, interstage, adapter and two fairing halves. Atlas-style profiles include separate boosters. These replace the incomplete exposed-stage assemblies for the four playable vehicle IDs; original source GLBs remain preserved. Dimensions/silhouettes are illustrative, not verified real vehicle CAD or altered performance curves.

Fairings separate during ascent. The upper-stage plume now follows the actual engine node instead of a guessed fraction of total rocket height. `launchSite.js` adds three pads (active plus two standby vehicles), access roads and markings, assembly/operations buildings, service structures, vegetation and grass tufts. Static geometry is batched by material and vegetation is instanced. No whole external scene/application was imported.

## Continuous deployment

The actual assembled payload is loaded inside the rocket fairing, carried up through ascent and transferred into the orbital presentation. `launchSpace.js` receives that same spacecraft/assembly and the current camera/target/horizon instead of constructing another spacecraft in a polar shot. There is no black transition frame. Tracking approaches the upper stage continuously, then pulls back through separation and hinge deployment to the stable orbital view. The operations continuation retains the same renderer and spacecraft; refresh/explicit Skip can use the standalone view with matching framing and insertion phase.

Insertion starts away from the geographic-pole display. Visual revolutions now match the six sampled operational passes. The cinematic remains compressed and uses illustrative scene scales, not a validated physical ascent/ephemeris. Lunar missions explicitly label compressed travel and blend arrival bodies; no real transfer solution is claimed.

## Lunar imagery and credits

The Moon uses NASA's Scientific Visualization Studio [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/): LRO LROC colour imagery and the LOLA preview as a restrained artistic bump map. The colour JPEG is 2048 × 1024; the height preview is 1024 × 512. The two unchanged downloads total **569,494 bytes**. Exact URLs and SHA-256 are recorded in `textures/moon/manifest.json`. Credit: NASA's Scientific Visualization Studio / Ernie Wright, Noah Petro / LRO LROC and LOLA teams.

NASA identifies the colour maps as optimized for rendering aesthetics, not scientific analysis. The bump treatment here is not calibrated terrain displacement and does not affect mission scores. Lunar 3D scenes and late lunar mission cards now share this imagery. The deep-space observatory card is no longer represented as a Moon mission. Lunar briefs include the source credit link.

## Verification

- Live builder inspection: recognizable navy photovoltaic cells, frames and bus-contacting yokes; no detached source strips; no console warnings/errors at checked checkpoints.
- Live launch inspection: complete closed rocket, roads/vegetation/other launchers; unskipped launch reached operations without console errors.
- `tests/scene-repairs.test.html`: 43 checks for all four complete named stacks, interstage overlap, native solar texture, hinge contacts, site contents/batches, same spacecraft/camera at handoff, continuous endpoint and no operations-start jump.
- Existing full `tests/launch.test.html`: seven checks passed, including separation, unfolding, one completion and canvas cleanup. Observed rolling frame time in the in-app test was 24.4 ms with 68 draw calls at the measured checkpoint; this is not a universal FPS claim.
- Lunar 3D preview was visually inspected after local texture decoding; no console errors at that checkpoint.

The visual test's prior generic-shader assertion now accepts the dedicated native photovoltaic material as well as the shared HD finish; it was not removed. Missing assets and unavailable WebGL still retain existing gameplay controls/fallbacks. No save reset or scoring change was required.
