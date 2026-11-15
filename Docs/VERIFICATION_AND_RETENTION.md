# Verification and retention

The active candidate record is [UsabilityRelease, 11 November 2026](../Verification/UsabilityRelease-2026-11-11/README.md). Historical accepted candidates are [MissionJourney](../Verification/MissionJourney-2026-11-11/README.md) and [CompleteGameplay](../Verification/CompleteGameplay-2026-11-11/README.md). Their results are historical until rerun against a new identity. The active record's acceptance summary identifies what was actually rerun.

## Model and browser checks

Use a distinct evidence directory for every run. Most model scripts accept it as their first argument; `Check-PackagedBrowser.mjs` takes `ORBITAL_TEST_ARTIFACTS`. Read arguments before invoking older scripts, because some defaults target historical records.

```powershell
node Tools/Check-ForecastResponsiveness.mjs Verification/UsabilityRelease-2026-11-11
node Tools/Check-PackageOwnership.mjs Verification/UsabilityRelease-2026-11-11
node Tools/Check-CompleteGameplay.mjs Verification/UsabilityRelease-2026-11-11/Models
node Tools/Check-GameplayBoundaries.mjs Verification/UsabilityRelease-2026-11-11/Models
node Tools/Check-CampaignModels.mjs Verification/UsabilityRelease-2026-11-11/Models
$env:ORBITAL_TEST_ARTIFACTS='Verification/UsabilityRelease-2026-11-11/Browser'
node Tools/Check-PackagedBrowser.mjs
node Tools/Check-FlightCredibility.mjs Verification/UsabilityRelease-2026-11-11/Flight
node Tools/Check-NasaData.mjs Verification/UsabilityRelease-2026-11-11/Nasa
node Tools/Check-WebUIImports.mjs
node --experimental-vm-modules Tools/Check-NativeSceneAdapter.mjs
node Tools/Check-LaunchShaderLifetime.mjs
node Tools/Check-PackDeterminism.mjs Verification/UsabilityRelease-2026-11-11/package-files.json
& 'F:/Unity/Editors/6000.6.8f1/Editor/Data/DotNetSdk/dotnet.exe' run --project Tools/CoreChecks
```

## Windows harness ownership

Launch the complete candidate with a fresh, explicit `ORBITAL_PROFILE_DIR`, `ORBITAL_EXPORT_DIR` and a unique loopback WebView2 debugging port. Do not attach test harnesses to the production profile. Configure `ORBITAL_TEST_PORT`, `ORBITAL_TEST_ARTIFACTS`, `ORBITAL_TEST_EXPORT_DIR` accordingly. `Check-EmbeddedCampaign.mjs campaign` flies available campaign missions without prerequisite fixtures; advanced mechanics checks explicitly use fixtures. `ORBITAL_TEST_SKIP_OPERATIONS=1` uses authoritative calculated skipping, not forced success. `ORBITAL_TEST_RELOAD_EACH=1` reloads phase checkpoints.

Model checks establish numerical and persistence invariants. Browser suites establish packaged JavaScript behavior. CDP against the Windows player establishes WebView2-host behavior, exports and navigation, but does not measure Unity rendering or prove native focus/layout. Native UI inspection is recorded separately. Automated UI operation is not a learner study or a complete screen-reader test.

## Retention policy

Keep accepted manifests, test summaries, failures and explanations, representative screenshots, exported reports/comparisons, source pins, provenance, scoped original files and one usable complete rollback. Keep all personal profiles and unknown recovery data. Keep the candidate in one location and give each harness its own profile and evidence directory; no player copy is needed for profile isolation.

After a run finishes, identify its processes and close its owned host. Remove only proven regenerable browser HTTP/code/GPU caches from inactive verification profiles. Never remove Local Storage, IndexedDB, exports or profile settings as cache cleanup. Successful packaged-browser runs now retain tests, logs and `fixture-inputs.json` while pruning their own copied `models` and `vendor` trees; a failed run retains the full fixture. Pass `--keep-fixture` when intentionally retaining a successful fixture. Keep the exact package identity that can regenerate these inputs. Do not prune a profile or artifact referenced by a live process. Log path, size, class, dependency reasoning and recovery for every removal. Bytes moved or archived are separate from bytes actually freed on the volume.

No wholesale `Library` deletion, Unity module removal or automatic age-based pruning is authorized by this policy. Recheck dependencies and a clean build before package removal. Preserve unknown files for review.
