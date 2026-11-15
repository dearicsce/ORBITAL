# UI recovery — 15 November 2026

The maintained project is `F:/ORBITAL-Unity`. This recovery addresses the title, mission-switch dialog, flood artwork, launcher/orbit/planning/review/flight/operations presentation and fictional vehicle names shown in the user's screenshots. It preserves the stage progression selector and existing mission IDs, simulation/scoring and saved designs.

## Causes and changes

- `Tools/EmbeddedUI/theme.css` had replaced a reference stylesheet containing structural screen rules. Restored those rules in an independently owned `screen-layout.css` and retained the navy/teal semantic tokens. Screen-specific layout is maintained in `presentation/recovery.css`; removed the obsolete absolute launcher offsets from `flight-console.css`.
- The live adapter's title mount had become an empty function. Restored its native Earth mount/cleanup. The existing thumbnail bridge now also supports the Earth scene, so the renderer can be verified independently of WebView2's transparent surface.
- Mission switching used `window.confirm`. Replaced it with a themed native HTML dialog, safe default focus, Escape cancellation and route cleanup. Opening/cancelling preserves the draft; confirmation performs the existing mission switch.
- The flood photograph contains a white footer in the image itself. Its image frame crops that footer without modifying the reference image or removing the separate source information.
- Launcher and orbit selection now allocate separate grid regions to the model, engineering panel, journey and actions. Ascent uses the full scene with bounded instruments. The review presents the actual spacecraft beside compact role cards and an accessible Launch action.
- Replaced unrelated cropped character photographs with original vector role insignia in guides and evaluation cards.
- Original launcher presets display Kestrel, Condor, Albatross and Roc. Six additional fictional vehicle names remain. Stable IDs and engineering values are unchanged. Flight Academy's two literal Falcon 9 labels also use Kestrel.
- Retained ascent-to-operations and resumed operations now share `createFlightFrame`. Solar System displays the Sun, eight planets, the Moon and the player's marker; Earth–Moon, spacecraft and local orbit modes remain available. The view labels its separate illustrative scales. Focus spacecraft updates and saves the selected mode correctly. Labels avoid one another, and the solar status strip leaves them unobscured. Picking excludes hidden bodies. Scene listeners and resources are cleaned up.

## Verification and artifacts

Evidence and the isolated complete Windows candidate are in `Verification/UIRecovery-20261115`.

- `check-ui.mjs`: live Windows WebView2 route; title mount/transparency, custom names, confirm/cancel, cropped artwork, launcher/orbit layout at 1366×768, 1280×720 and 1024×768, flight plan, review, ascent, operations, four cameras and resume. Writes `ui-checks.json` and screenshots.
- `check-native.mjs`: obtains a PNG from Unity's actual title Earth renderer (`native-title-earth.png`). WebView2 browser screenshots alone omit this native surface.
- `check-handoff.mjs`: completes numerical ascent/deployment naturally near the calculated end and checks the retained scene's Solar System and spacecraft cameras.
- `check-workshop-path.mjs`: follows mission preset → workshop → launcher → orbit → plan → review → ascent → operations → report, checks the fitted review layout, and compares the flown assembly against the workshop-approved assembly.
- `check-copied-profile.mjs`: opens an isolated copy of the installed profile and verifies Continue Campaign preserves completion records and run identity where present. It does not modify the original profile.
- `check-models.mjs`: loads all ten authored launcher GLBs through the actual Windows host, checks upper-stage/fairing nodes and validates the two Academy name replacements.
- `check-dip-brief.mjs`: checks the shared Kepler briefing at three resolutions and verifies a non-default observation window, Short Contact and Bracket Four survive the transition to the workshop.
- Existing framing, downstream exhaust/stage cutoff, launcher numerical ascent and packaged import regressions run through `continue-recovery.mjs regressions`. Unity also runs the existing build-time engineering verification.
- `check-release.mjs` verifies the complete candidate's packaged WebUI inventory and records full player hashes. `Install-VerifiedCandidate.ps1` validates the staged copy and retains the preceding `Build-Current` as a timestamped rollback. Exact installation identity is recorded in `installed-release.json`.
- `check-installed.mjs` verifies the actual root launcher, installed manifest, CSS bytes served by WebView2, the single Continue Campaign action, custom launcher names and Unity's title Earth render. Results are in `installed-entrypoint.json`.

Installed package: `b7c7b33aa01ed41bbeb6c368aa712053594b47ad8b0b3adde9fd61cc163d14a2` (550 player files, 388 inventoried WebUI payloads plus their manifest). Previous player: `Build-Current.Rollback-20261115-110928`. An orphaned embedded UI host from the previously closed player held the old directory open; its game parent no longer existed. Stopped that exact background process and reused the already hash-verified staging directory. The installer now guards against a running installed UI host as well as the game process.

The first Unity build crashed inside its editor asset postprocessor. A subsequent single-worker build completed successfully. The desktop computer-use kernel also failed to restart after the runtime interruption (missing temporary `kernel.js`); verification therefore uses the actual Windows player's local debugging connection and Unity's native render reply. These checks cover the listed routes, not a new playthrough of every campaign mission.
