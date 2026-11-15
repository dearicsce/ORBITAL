# Scientific models and source provenance

The maintained [model notes](../Tools/EmbeddedUI/modelNotes.md), [mission evidence models](../MISSION_EVIDENCE_MODELS.md), [28-mission matrix](../MISSION_DIFFERENTIATION_MATRIX.md), [scoring contract](../Verification/CompleteGameplay-2026-11-11/SCORING_CONTRACT.md) and [science limits](../Verification/CompleteGameplay-2026-11-11/SCIENCE_LIMITS.md) describe the current browser campaign and hybrid player. [ENGINEERING.md](../ENGINEERING.md) retains the older native Floodwatch model separately.

Three optional archived NASA contexts are bundled offline: LANCE MODIS flood classification, FIRMS fire detections, and LRO lunar temperature/elevation context. Their numerical bundles, original identifiers/URLs, observation and retrieval metadata, units, processing and checksums live in `Tools/EmbeddedUI/NasaData` and the acquisition pins under `Tools/NasaPipeline`. Source cards in the game expose these records. No API account or live network is needed to fly bundled content.

Unknown/cloud-unspecified flood samples remain unknown, not dry land. Flood classification does not establish depth or damage. Fire detections do not establish burned area. Cold lunar conditions do not confirm ice. Historical Landsat/EO-1 images illustrate context and are not simulated measurements. Source-target access uses spherical points and sampled windows rather than calibrated instrument footprints. Authored scenario weights and simplified/speculative navigation remain labeled.

The workshop forecast assumes full initial battery, Autopilot, broad source priorities, fixed source integration caps and the first affordable incident choice. It excludes launch electricity and achieved insertion; it does not validate launch or transfer feasibility. Encounter missions show engineering values and direct players to flight planning rather than running the orbit-only operations scenario. Forecast batching preserves all authoritative simulation steps and does not mutate an active flight.

## Redistribution review

The external CYGNSS, CloudSat, Cassini and mobile-launcher GLBs have unresolved source/license records. This candidate excludes those four files, retains their identity in the pinned external snapshot, marks reference records `shipped:false`, and uses the existing procedural educational visuals. This is a targeted mitigation, not a certification of every other third-party asset. Retain bundled notices, asset manifests, NASA credits and source-specific restrictions. External redistribution still requires a full rights review.

This independent game existed before the event. See the active release's challenge research and disclosure draft. No competition eligibility, operational navigation accuracy, measured learner improvement or real-world spacecraft certification is asserted.
