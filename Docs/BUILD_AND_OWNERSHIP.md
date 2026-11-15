# Building ORBITAL and source ownership

The maintained project is `F:/ORBITAL-Unity`, pinned to Unity **6000.6.8f1 (237b6593792b)**, Windows x64 Mono, Built-in Render Pipeline and Direct3D 11. No package upgrade is part of this release. `Packages/manifest.json` and `packages-lock.json` define the existing Unity dependencies.

| Location | Owner / role | Edit here? |
| --- | --- | --- |
| `Assets/Orbital`, `Assets/Editor` | Unity runtime, numerical native core, native scene adapter and build entry point | Yes |
| `Tools/EmbeddedUI/*.js`, CSS, C# | ORBITAL gameplay extensions, host, presentation and learning tools | Yes |
| `Tools/EmbeddedUI/adapt*.mjs` | Exact-match/count checked adaptations of reference code | Yes; retain anchor validation |
| `Tools/EmbeddedUI/NasaData` | Validated, processed, numerical source subsets | Through the documented pipeline; retain checksums and limitations |
| `Tools/NasaPipeline` | Acquisition pins and processing documentation | Yes |
| `F:/space-mission-gaame_v_0.3` | External pre-existing browser snapshot | Preserve; never silently edit as part of packaging |
| `Tools/ReferenceInputs.lock.json` | Exact relative paths, lengths and SHA-256 of external inputs | Update deliberately after reviewing input drift |
| `Assets/StreamingAssets/WebUI` | Generated runtime output, including owned modules, checked adaptations and NASA bundles | Regenerate; do not fix only these copies |
| `Assets/StreamingAssets/EmbeddedUI` | Generated x64 host, WebView2 loader/core library and notices | Build from the owned host |
| `Build-Display` | Existing installed player, separate from maintained source and candidate | Preserve until explicit promotion |
| `Orbital.exe`, `Build-Current` | Root launcher and current cleaned complete player | Launcher source is `Tools/OrbitalLauncher.cs`; rebuild with `Tools/Build-Launcher.ps1`. Player is the default Unity build output. |
| `Verification/*/Candidate` or `FinalCandidate` | Identified built artifacts; validity comes from their manifests and accepted evidence | Retain accepted rollback; avoid redundant copies |

## Build in this order

Close the Unity editor for this project before the generated asset swap. Staging, adaptation and bundle validation must finish before Unity scans the assets.

For the root launcher, build to `Build-Current/ORBITAL.exe` (the default when
`ORBITAL_BUILD_PATH` is unset), then run `Tools/Build-Launcher.ps1`. The command
below illustrates an explicitly isolated historical candidate destination.

```powershell
node Tools/Pack-WebUI.mjs
& Tools/Build-EmbeddedUI.ps1
$env:ORBITAL_BUILD_PATH='F:/ORBITAL-Unity/Verification/UsabilityRelease-2026-11-11/Candidate Player/ORBITAL.exe'
& 'F:/Unity/Editors/6000.6.8f1/Editor/Unity.exe' -batchmode -nographics -quit -projectPath F:/ORBITAL-Unity -executeMethod OrbitalBuild.VerifyAndBuild -logFile F:/ORBITAL-Unity/Verification/UsabilityRelease-2026-11-11/unity-build-final.log
```

The host build uses .NET Framework's x64 C# compiler and the pinned `Microsoft.Web.WebView2` **1.0.3967.48** package under `Tools/Dependencies`; it retains that package's LICENSE and NOTICE. Build output must be a complete player from this project, not an old executable combined with new assets.

## External input acquisition

The external snapshot already exists on this computer; an authenticated upstream repository and a redistribution license for the complete snapshot have **not** been established. This is a pinned local dependency, not a verified clean-machine reproducible checkout. To relocate it, acquire the same snapshot through the owner's existing source backup, keep its directory structure, and run `node Tools/Pack-WebUI.mjs X:/path/to/snapshot`. The lock must match every listed path and hash. It covers authoring inputs as well as runtime candidates, so missing source-stage GLBs also signal drift even though they are excluded from the player.

For an intentional upstream change, preserve the prior input snapshot, review licensing and affected adaptation anchors, then explicitly run `node Tools/Pack-WebUI.mjs X:/path/to/snapshot --update-input-lock`. Review the lock diff and rerun packaging and regressions. This command records identity; it does not prove the changed input safe or licensed.

## Generated output ownership

The packer builds a clean staging tree, validates exact adaptations and NASA checksums, and writes an explicit `outputInventory` with all runtime hashes. The package identity includes the input lock, owned source identities, adaptations and NASA bundles. It checks the previous inventory before replacement. Unknown, changed or locally removed generated payloads cause refusal with a recovery instruction. Preserve such files outside the generated tree before retrying. Previous manifests, including any locally added metadata, are preserved by hash under `Verification/PackagingRecovery/Manifests`; manifests cannot hash themselves. Identical manifest bytes create no additional copy. A prior interrupted swap is retained for deliberate recovery. Surviving Unity `.meta` GUIDs are carried forward. Removed/renamed inputs cannot leave stale runtime files behind.

Identical inputs at the same configured reference path produce identical runtime contents; the manifest records absolute reference paths. Filesystem dates and Unity's generated metadata are not part of that byte-determinism claim. Relocation can therefore change metadata identity even when asset payloads match. Verification evidence: `Tools/Check-PackageOwnership.mjs`, `Tools/Check-PackDeterminism.mjs`.
