# Space Mission Design Game — current state

Updated 1 November 2026. Functional implementation covers steps 15–32 with user-approved scope changes. See STEP_STATUS.md for per-step evidence. Further graphics refinement is deferred; exhaustive manual device testing and GPU heap profiling are not claimed complete.

Implemented flow: menu → mission cards → Nova briefing → 3D rocket selection → 3D orbit selection → spacecraft builder → flight advisory → evaluation board → launch/video → orbit operations/events → report.

Training: fixed Kestrel; compare LEO and SSO, equip an empty spacecraft, learn mass/power/budget, pass ten checks, launch, and return to the menu. Training gives no mission unlocks or final stars.

Builder: resource table, category catalogue, paired solar wings, supplied GLB bus/solar/antenna meshes, camera presets, hover selection and removal, warnings and persistence. Scoring and world engineering values are unchanged. The engine was split into smaller modules behind the same public API.

Cast: supplied Small robot is Nova and replaces Commander Vance throughout. Supplied engineer/scientist/accountant portraits replace vector avatars. Dialogue appears beside the character near the top and can be expanded by hover/focus/click after speaking. No new visual assets should be generated without asking the user.

Materials: local mission photos; Jupiter-C and Ares I; extracted CYGNSS/CloudSat buses and CYGNSS wings; Cassini antenna; mobile launcher; GPM launch video; optional Moon briefing film. Source files in Documents and Downloads were copied, never modified. Albatross/Roc reuse Ares I pending optional future models. Saturn V print pieces were left aside at the user's direction. Previously created generic battery/fuel/instrument visuals remain until suitable separate supplied parts exist.

Offline: local Three.js 0.160, Draco JS/WASM decoder, models and media. Start-Game.cmd / Start-Game.ps1 provide a Windows local server with video range support. Original Earth texture retained.

Verification: original engineering tests 15/15, state tests 33/33, events tests 23/23. Rechecked original test scripts with VM modules and memory storage after asset integration. All eight copied supplied GLBs decoded successfully using the local JavaScript Draco decoder; results in tests/model-decode-results.json. Authored modules parse and imports resolve. Earlier browser walkthrough completed training; latest browser checks verified supplied Nova and rocket rendering and mission/brief/rocket keyboard navigation. See BUG_SWEEP.md for limits.

Remaining: full three-mission/difficulty playthrough, final phone/desktop review, GPU heap profiling, bespoke heavy rocket visuals, exact real-model separation animation, source/license verification, competition submission. Team mode is intentionally a placeholder from the plan.

Latest browser checks: supplied Nova portrait and Jupiter-C render; keyboard mission-to-brief-to-rocket navigation works. Repeated navigation leaves one active canvas and removes it on leaving 3D. Fixed multi-material component extraction after the full-flow regression identified empty bus/wing groups.

Current development checkpoint: revised step 26 live ascent and step 27 supplied-geometry deployment pass the 7-check live browser regression. Step 28 uses the actual assembly and passes all-five-effects/disposal smoke check. Reference launch video autoplay removed at user request. See STEP_CHECKS.md for verification boundaries and ASSETS_NEEDED.md for missing mechanical model parts.

Latest update: flight-result snapshots persist across refresh; training goals have shared tested predicates and bypass guards; failed-launch report caps use a shared tested scoring path. Final browser report/training acceptance 18/18; current original rule regression 71/71; syntax/import audit clean. New staged Falcon/Atlas sources and Orbiter scenery are indexed for later graphics work. The launcher can recover when an old preview owns its default port.

Graphics pass implemented: supplied textured Falcon 9/Atlas V staged assemblies and Falcon adapter; real vehicle names with scaled educational performance values; optimized runtime meshes/textures; Orbiter launch pad/VAB and DDS textures imported directly; physical lighting, shadows, atmosphere, exhaust/smoke, stage detachment, camera easing and scene handoff alignment. Source originals unchanged. See GRAPHICS_PASS.md and tests/graphics-results.json for checks and limits.
