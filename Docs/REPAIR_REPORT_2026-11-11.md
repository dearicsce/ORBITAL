# ORBITAL repair — 11 November 2026

## Delivered

Launch `F:/ORBITAL-Unity/Orbital.exe` to play the corrected `Build-Current` player. The game open at the beginning of this work came from the older `Build-Display`; that folder remains an older rollback. Personal saves outside Verification were not touched.

### Tutorial highlights

The floating cyan rectangle in `js/ui/speech.js` took a card's viewport coordinates once, then updated only on window resize or scroll. It did not track asynchronous panel layout, inserted journey guidance, or transitions. The owned `Tools/EmbeddedUI/speech.js` now applies a CSS outline directly to the actual card, with an inset offset. Dismissal/navigation removes it. `Tools/Pack-WebUI.mjs` packages the owned module, so regeneration preserves the fix.

### Ascent and logic boundaries

The maintained game already had numerical staged ascent (gravity, atmospheric drag, thrust, propellant use, mass changes and guided insertion). Existing successful mission trajectories passed its physical checks before this repair; the unsupported claim that every ascent trajectory was broken would be inaccurate.

The review found that target validation admitted negative/nonfinite eccentricity and a wrong celestial body. A wrong-body custom target could also return null and route to the old scripted animation. These cases now reach explicit numerical validation and fail instead of silently animating success.

An underpowered ascent that first reached space could continue descending back into the atmosphere until ground impact. The model now terminates at the actual descending 100 km crossing, reports atmospheric reentry as a failed insertion, cuts thrust, and does not deploy a payload. It does not clamp the trajectory upward or fabricate a successful orbit. Regression fixture: weakened upper stage fails at 99,961 m, descending at 837 m/s. Detailed heating and breakup remain outside this educational model. Historical ascent-1 saves retain their historical simulation compatibility.

## Verification

- Full Unity `VerifyAndBuild`: engineering verification passed; Windows build succeeded, editor exited 0.
- Native CoreChecks: persistence/frame validation, nominal delivered data and power reserve, and 288 catalogue/lighting configurations passed.
- Packaged browser regression suites: 12/12 passed, covering program rules, physics, contracts, campaign operations, mission flow, completion, continuity, numerical/transfer ascent, orbital geometry/operations and workshop.
- Campaign models: all 28 campaign missions passed; ascent checks cover 29 reference rockets including training.
- Actual Windows campaign: 28/28 missions passed using the calculated-result shortcut for operations, not forced success. This verifies campaign progression/outcomes and UI integration, not every second of real-time flight. A first harness attempt reused the layout fixture's profile and stalled at review; the clean isolated-profile rerun passed. Both records are retained.
- Flight credibility: engine ignition/throttle limits, fuel/mass accounting, coast energy, timestep convergence, failure behavior and legacy compatibility passed.
- Complete gameplay and boundaries: transfer navigation, relay scheduling, evidence experiments, persistence boundaries and mission-end behavior passed.
- UI: 23 responsive layout checks; nine launcher/orbit/review highlight checks across three viewport sizes; five flight-framing layouts passed. Screenshots inspected for alignment.
- Windows flight view: pad, 150 s and 350 s paused flight checkpoints render the vehicle and calculated telemetry. These are checkpoint inspections, not a full real-time flight soak.
- Packaging: 568 relative imports resolve. The source prompt is parsed and each restored text file is SHA-256 verified.

These checks cover the reported defects and major gameplay systems; they are not proof that every possible custom design, graphics driver, save state or gameplay sequence is free of bugs.

## Cleanup

At least **12,666,762,561 bytes (12.67 GB / 11.80 GiB)** were deleted from obsolete verification/build outputs and inactive WebView caches. This is actual deletion, not moving them elsewhere. Repeated player builds, large duplicate model/video folders, isolated Unity build caches and downloaded browser components accounted for most of the growth.

Source, required assets, personal saves, historical source snapshots, reports and screenshots were retained. Main Unity Library is only about 0.21 GiB and remains useful for development. Current player and one older rollback remain. The deletion ledger records each resolved path, reason, bytes and process check at `Docs/Repair-2026-11-11/cleanup-manifest.json`. Historical documents referencing deleted generated players are historical records, not working launch links.

## Complete source prompt

`Docs/ORBITAL_COMPLETE_SOURCE_PROMPT.md` embeds the project's text source, Unity scene/settings metadata, runtime web source, build/check scripts and pinned browser source. Required binary assets are identified by original local path and checksum. `Tools/Restore-SourcePrompt.py` reconstructs to a new empty folder; `--copy-assets` validates and copies existing binaries. Third-party closed-source runtimes and the Unity editor are prerequisites, not invented source code. The prompt is intentionally a file attachment because its full source is too large for an ordinary chat paste.

The prompt's assembly steps explicitly use `node Tools/Pack-WebUI.mjs ./ReferenceSource`, then build the WebView2 host, full Unity player and root launcher. The exact browser snapshot remains a local dependency with unresolved redistribution provenance; this is an owner's reconstruction handoff, not a new licensing grant.

## Final reconstruction result and cleanup limitation

The final handoff contains **1,154 text files and 241 required binary assets**. Restoring all of them with hash checks, then running the packer against the restored ReferenceSource succeeded; all 568 runtime relative imports resolved.

Automatic approval review then rejected deletion of the following newly created temporary folders, returning only `blocked by policy`. They remain; no claim is made that every temporary artifact was deleted. The isolated player has been closed, and these folders can be removed manually without affecting the corrected game or personal saves:

- `F:/ORBITAL-Unity/Verification/Repair-2026-11-11/PromptRestore`
- `F:/ORBITAL-Unity/Verification/Repair-2026-11-11/ReassemblyCheck`
- `F:/ORBITAL-Unity/Verification/Repair-2026-11-11/Host/Profile`

Their sizes and final Verification size are recorded in `Docs/Repair-2026-11-11/temporary-folders.json` and `final-storage.json`. The successful 12.67 GB historical cleanup remains separate from these new temporary artifacts.
