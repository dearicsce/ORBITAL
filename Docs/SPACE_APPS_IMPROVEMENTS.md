# Space Apps improvement priorities — 11 November 2026

This review covers the game's three bundled NASA contexts, the acquisition tools,
source cards, scoring models and navigation approximation. It is not a survey of
NASA's entire data catalogue. Recommendations below are proposed work, not new
features delivered by the cleanup.

## Most valuable next work

1. **Prove one learning outcome with a short Floodwatch mission.** The game already
   has forecasts, comparisons, source cards and 28 missions. Give a new player a
   five-minute task: return useful observations before a deadline, fail because of
   one visible resource constraint, change one design choice, and compare the cost
   and returned evidence. Test with five beginners; record completion, help needed,
   and whether each can explain the trade-off. Existing automated passes do not
   establish learning. This is the highest-priority product recommendation.
   The new Floodwatch report capture also shows the advisor bubble overlapping
   the top journey controls at 1366×768 (`Verification/Cleanup-2026-11-11/Host/m1-report.png`).
   Move that advice into a collapsible report section or reserve space for it;
   keep the result, limiting resource and next action visible together.

2. **Complete flood quality information before expanding the dataset.** The current
   bundle contains 32 native MODIS classification samples from a two-day GeoTIFF;
   it does not contain the full valid-observation/cloud-shadow ancillary layers.
   Acquire those layers from the matching HDF product, preserve missing values,
   and show “unknown” separately from “no water.” Let the player compare a quicker
   one-day result with a delayed composite and its quality limitations. Keep data
   acquisition dates distinct from the simulated spacecraft's follow-up time.
   NASA documents the separate GeoTIFF composites, HDF ancillary layers and shadow
   false positives in the [MODIS flood user guide](https://www.earthdata.nasa.gov/s3fs-public/imported/MCDWD_UserGuide_RevB.pdf).

3. **Make wildfire decisions visibly depend on confidence and delivery time.**
   These mechanics already exist in the bundled Rhodes MODIS scenario. Expose two
   compared outcomes: urgent downlink of a few high-confidence detections versus
   a larger batch arriving late. Show confidence, observation UTC and pixel
   footprint alongside the result; do not label hotspot count as burned area.
   NASA's [FIRMS map explanation](https://firms.modaps.eosdis.nasa.gov/map/?os=firetv)
   explains that a detection is not an entirely burning pixel and that clouds can
   obscure detections. Add a distinct burned-area product only if the learning
   objective actually needs area estimation.

4. **Give lunar choices a thermal-versus-power trade-off.** The current Diviner
   and LOLA samples provide temperature/elevation context, not an illumination
   simulation. A follow-up version could combine validated terrain/illumination
   data with a clearly labeled heater/battery model, so choosing a colder science
   target competes with energy and communications availability. Temperature alone
   must not award “ice discovered.” The [Diviner instrument team](https://www.diviner.ucla.edu/science)
   describes thermal mapping and candidate cold traps; an ice claim requires
   additional evidence. Add appropriate spatial and temporal alignment checks
   before combining products.

5. **Replace the dated circular orbit approximation only when it supports a
   clear mission decision.** `Tools/EmbeddedUI/navigation.js` currently derives
   Earth/Mars phase from a reference epoch, uses circular coplanar bodies, and
   gives the Moon an authored initial phase. It is not interpolated Horizons
   navigation. For a launch-window lesson, bundle a bounded series of actual
   Horizons position/velocity vectors, pin center/frame/time scale/units, validate
   interpolation error against withheld samples, and version saves. The
   [JPL Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html) documents
   vector outputs and time/reference-frame choices. Do not describe the current
   lunar dates as real mission launch windows.

6. **Reduce demonstration friction and establish release evidence.** Use the new
   root launcher; time launch-to-clickable-menu on the intended demo laptop. Test
   offline on a second Windows machine with the documented WebView2 requirement.
   Check readable text, keyboard focus and display scaling with actual users.
   Keep one clear source → player choice → changed outcome demonstration. More
   missions, multiplayer or higher-detail graphics are lower priorities until
   this experience is reliable and understandable.

## Event preparation

NASA's [2026 announcement](https://science.nasa.gov/universe/nasa-welcomes-all-ages-experience-levels-for-space-apps-challenge/)
lists the global event for 14–15 November 2026. Confirm your own local schedule.
The official [Space Mission Design Game challenge page](https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/)
returned HTTP 502 during this review, so its current detailed requirements were
not independently revalidated here. The prior local challenge record remains
historical evidence. Verify the actual challenge/submission requirements and
disclose pre-existing work and AI assistance accurately. Do not infer eligibility
from the game running successfully.

Suggested demonstration: launch → choose Floodwatch/NASA context → show the source
and observation date → explain one resource constraint → run → change one choice
→ compare delivered useful evidence and cost. Keep the limitations beside the
numbers so the player can distinguish observations from the educational model.
