# Orbit and connected-view repair — 15 November 2026

This repair addresses the reported stationary spacecraft and disappearing Solar System. It is not a claim that every game defect has been eliminated or that the project will receive 25/25.

## Installed release

The complete Unity release is installed in `Build-Current`, used by the root `Orbital.exe` launcher. All 555 staged files were SHA-256 verified before promotion. The Windows view checks are bound to package-manifest hash `64543c73bfedf93ffc90f7c3af65e7a740e645ba079b61f2ba4a2596ebabd0e7`.

Previous player: `Build-Current.Rollback-20261115-145124`. Durable browser storage and exports were copied to `Verification/OrbitalViews-2026-11-15/ProfileBefore-20261115-145124`; the existing profile remains in place. `Verification/OrbitalViews-2026-11-15/installation.json` records the installed file hashes and backup locations.

## Confirmed causes and changes

| Finding | Repair |
| --- | --- |
| Atlas satellite used a constant offset from Earth, partly overlapping the planet. | An inclined illustrative orbit now carries the marker around Earth, with surface clearance. It is named an example satellite, not the player's active vehicle. |
| Encounter scene drew a capture ring but never advanced the spacecraft. | Captured spacecraft follow a complete circular preview; flybys follow an unbound pass; rendezvous holds relative position. The camera fits the complete path. |
| Local flight modes explicitly hid the entire solar group. | Solar context remains visible, rebased around the local Earth/Moon origin. Duplicate overview bodies are hidden. The same propagated spacecraft position is retained across camera changes. |
| Local encounters were isolated from the surrounding system. | Planet and lunar encounters retain an illustrative Solar System that can be inspected by zooming out. Small-body targets without a planetary context retain the transfer-map toggle. |
| Background planetary motion ran on a separate wall clock and exaggerated each orbital period differently. | Flight context uses mission time and approximate period ratios. Pause/reload/camera selection no longer advance an independent background clock. |
| Distant labels could appear over a foreground planet. | Label placement checks occlusion by visible body spheres. |
| Planet selection kept the camera too far from a small planet. | Focus distance now accounts for the selected body's radius, rings and viewport aspect ratio. |

The normal Earth/lunar operations satellite already used two-body propagation; that engine was retained. A spacecraft-following camera intentionally keeps the spacecraft near the screen centre. A body-fixed geostationary view can correctly show a stationary spacecraft. Camera notes now explain both behaviors.

## Scientific scope

- Earth/lunar operations use the existing orbital elements and simulation clock. The tests verify half-orbit movement and full-orbit closure for LEO, SSO, GEO and lunar orbit.
- The atlas, encounter preview, solar starting phases, body sizes and compressed distances remain illustrative. They are not new navigation ephemerides and do not affect scoring.
- Captured encounter previews explicitly say **one revolution per 36 seconds**. This is a demonstration clock, separate from mission time; pausing or hiding the preview freezes it. Flyby previews do not loop into a fabricated bound orbit.
- The lunar context uses a sidereal period of approximately 27.32 days, consistent with [NASA's Moon fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html). See also [NASA's explanation of lunar phases](https://science.nasa.gov/moon/moon-phases/). The authored phase is not an observation-date prediction.
- Local illumination and communications continue to use the existing educational engine assumptions; the decorative solar context is not their numerical input.

## Verification

Commands run from `F:/ORBITAL-Unity`:

```powershell
node --experimental-vm-modules --experimental-loader ./Tools/three-loader.mjs Tools/Check-OrbitalViews.mjs
node Tools/Check-WebUIImports.mjs
node Tools/Check-CampaignModels.mjs
node Tools/Check-CompleteGameplay.mjs Verification/OrbitalViews-2026-11-15/Gameplay
node Tools/Check-GameplayBoundaries.mjs
$env:ORBITAL_TEST_PORT='19615'
node Tools/Check-OrbitalViewsHost.mjs
```

The geometry regression uses real Three.js transforms and the existing propagator, with only GPU/DOM/assets stubbed. The Windows check uses an isolated profile in the actual WebView2 player and captures rendered images. The campaign checks exercise resource accounting, transfers, scoring and persistence; passing those checks is not evidence of learner outcomes or a complete manual playthrough of every mission.

Source backups, screenshots, geometry measurements and Unity build logs are under `Verification/OrbitalViews-2026-11-15`. Maintained changes are in `Tools/EmbeddedUI`, and generated WebUI files are produced by `Tools/Pack-WebUI.mjs`.

## Evidence still needed for the supplied judging rubric

| Criterion | Concrete next evidence |
| --- | --- |
| Impact | Observe beginners playing; measure whether they can explain a mission trade-off before and after. |
| Creativity | Demonstrate the linked design → launch → operations → evidence loop, including two feasible designs with different compromises. |
| Validity | Keep model limitations visible and complete a manual demo against the exact release build. These regression checks support this criterion but do not establish operational mission accuracy. |
| Relevance | Show a NASA source parameter changing a player decision and the resulting mission evidence, using the existing integrated datasets. |
| Presentation | Record a short failure → explanation → redesign → successful evidence-return story. Include the cost of the improvement. |

These are evidence requirements from the supplied challenge and rubric, not predictions of judges' scores.
