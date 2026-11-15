# ORBITAL Windows builds

The current console, exhaust, NASA Eyes map and ten-launcher update is recorded in [SceneRepair](../Verification/SceneRepair/README.md).

The title screen update is recorded in [TitleRedesign](../Verification/TitleRedesign/README.md).

The current build includes the [Blender launcher fleet and campaign layout update](../Verification/BlenderLaunchers/README.md).

The full campaign release is documented in [FullCampaign](../Verification/FullCampaign/README.md). The root launcher opens the current installation in Build-Current. The campaign verification matrix and complete candidate hashes are in the same release record. Use the release record's Play-Candidate.cmd for a separate play profile.

The earlier Build-Display release procedure is preserved below.
# Candidate review, promotion and rollback

The current build record and ledger are in [UsabilityRelease-2026-11-11](../Verification/UsabilityRelease-2026-11-11/README.md). Keep its complete `Candidate Player` directory together. Use its `Play-Candidate.cmd` for a separate writable play profile and exports. Do not launch the executable directly when intending isolation: a direct launch uses the normal profile unless `ORBITAL_PROFILE_DIR` is explicitly set.

Windows x64, Direct3D 11, Microsoft Edge WebView2 Evergreen Runtime and .NET Framework 4.6.2 or later are required. The x64 WebView2 loader/core assemblies and their notices are bundled; Evergreen itself is an installed dependency. Test-machine operation is not proof of clean-machine installation. Bundled gameplay/data work offline; original source links need a connection. Keep install assets read-only and profiles in a user-writable folder. `ORBITAL_PROFILE_DIR` and `ORBITAL_EXPORT_DIR` must be absolute paths when overridden.

Check the whole candidate against its manifest before promotion:

```powershell
& Tools/Install-CompleteGameplayCandidate.ps1 -Record UsabilityRelease-2026-11-11 -CandidateDirectory 'Candidate Player' -VerifyOnly
```

Promotion is intentionally separate from building and testing. Close the installed ORBITAL and its host first, retain personal exports and a profile backup, then run the same command without `-VerifyOnly` only when choosing to promote. It verifies the manifest, refuses a running installed player/host, stages the complete build and retains the previous installation in `Build-Display.Rollback-<timestamp>`. It does not modify profiles. This task does not automatically promote or publish.

To roll back, close ORBITAL, retain newly exported reports/designs and the new candidate, move the promoted installation aside, and restore the complete dated rollback directory as `Build-Display`. Test older binaries against a **copy** of saves first; an older build may not recognize newer model/bundle IDs. No save reset is part of rollback.

Unresolved reference GLBs are excluded from this candidate, but this does not finish a full redistribution review or establish Space Apps eligibility. See [source/science limits](SCIENCE_AND_SOURCES.md) and the active challenge/disclosure record.
