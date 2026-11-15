# ORBITAL numerical NASA subsets

These tools prepare data for the existing offline game. They do not add a runtime API, account requirement or server.

The [11 November candidate](../../Verification/CompleteGameplay-2026-11-11/README.md) adds an obtainable numerical flood-context subset. Run `npm.cmd ci --prefix Tools/Dependencies/FloodProcessing --no-audit --no-fund`, then `node Tools/NasaPipeline/acquire-flood-context.mjs`. It decodes the pinned complete NASA LANCE F2 GeoTIFF for h24v06 on 10 November 2026, verifies native grid/class encoding, and selects 32 native pixel centres without interpolation. `flood-pin.json` binds the exact raw SHA-256 and original retrieval snapshot; exact-byte reacquisition does not rewrite replay attribution. Processing inputs/evidence are under Verification/CompleteGameplay-2026-11-11. Class 255 is insufficient data, never dry. Cloud-specific mask entries remain unknown because the GeoTIFF does not contain the full HDF ancillary mask/count layers. The full flood-mask requirement is still partial. The older blocked acquisition attempts below are historical, not the current classification-acquisition status.

```powershell
node Tools/NasaPipeline/acquire-lunar.mjs
node Tools/NasaPipeline/acquire-fire.mjs
node Tools/NasaPipeline/discover-flood.mjs 2022-08-29
node Tools/Pack-WebUI.mjs
node Tools/Check-NasaData.mjs
node Tools/Check-PackDeterminism.mjs
```

The flood discovery command exits nonzero when no historical granules are returned. That is an acquisition failure, not dry-land evidence. Additional NASA GIS archive failures are recorded under Verification/Sol61-2026-11-10; no browse colours have been converted to quantitative classes.

`download.mjs` serializes requests in these scripts, bounds response sizes and timeouts, retries transient failures with backoff, caches exact bytes and metadata, verifies cached hashes, rejects HTML/auth redirects and enforces `pins.json`. Default maximum is 8 MiB per request. Only explicitly allowed HTTPS hosts are accepted. Range requests must return 206. Never put credentials into URLs. An authorized caller may supply a token only to this tooling API; it is neither logged nor copied into assets. The current lunar and fire inputs need no credentials.

Prepared source ownership is Tools/EmbeddedUI/NasaData. Packaging validates each processed SHA-256 and creates js/unity/nasaBundles.js, registered in dependency-manifest.json. Source data and gameplay assumptions are separate fields. Source products carry provider/version/URL, acquisition and retrieval UTC, units, grid or detection resolution, coordinate convention, missing-data meaning, attribution, redistribution notes and raw-byte checksum. Range checksums describe the acquired excerpt, not an unacquired full product. Complete raw input excerpts and labels remain in the verification SourceCache.

Lunar processing: complete 68-byte Diviner PCP records; select cells south of 88 S, retain <=24 evenly sampled cells; convert planetocentric latitude/east longitude to spherical south polar stereographic coordinates; nearest LOLA 240 m pixel using the labeled offsets and little-endian 32-bit floats; convert km above the 1737.4 km reference sphere to m. These are multi-year seasonal average bolometric brightness temperatures and interpolated topography from distinct observation periods. They do not establish ice, permanent shadow or terrain illumination. Nearest-grid mismatch is up to about 170 m before product/datum uncertainties.

Fire processing: retain MODIS standard-processing Greece rows in the Rhodes bounds for 23 July 2023, type 0. Preserve UTC, confidence, source row version, platform, scan/track dimensions and FRP. No detection is converted to burned area. Confidence weighting and follow-up latency decay are explicit authored score policies.

Bundle IDs/versions and checksums are frozen into new runs only when the player opts in at the existing workshop. Historical runs retain their original scenario. The operations byte ledger, power model, receipt deadlines, report and trial infrastructure remain authoritative. On mission changes, the optional bundle selection is cleared to avoid leaking one mission's source into another.

Changing a pinned source requires a reviewed new bundle/model version and replay/migration checks. Do not overwrite the meaning of an existing bundle ID, rewrite historical reports or fabricate a substitute for unavailable data.
