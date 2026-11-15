# ORBITAL realism and Space Apps review

Reviewed 5 November 2026. This is an engineering review, not certification of competition eligibility.

## Challenge match and limits of verification

Selected challenge: https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/
The exact page returned HTTP 502 during this review. Its challenge summary was independently visible in the official platform’s About the Challenge sections at https://www.spaceappschallenge.org/2026/find-a-team/missionforge/ and https://www.spaceappschallenge.org/2026/find-a-team/project_morazan/. Full detailed requirements and resources remain unverified.

The summary asks for an interactive mission design/management simulation with engineering choices and limited resources. ORBITAL implements objectives, spacecraft, instruments, launchers, budget, power, mass, communications, orbital constraints and outcome reports. This supports alignment with the summary; it does not establish compliance with unavailable detailed requirements. No verified requirement mandates photorealism or a full N-body simulator.

## Major submission issues to resolve

- License and asset rights. No project-wide LICENSE was found. models/manifest.json explicitly marks the supplied mobile launcher and several historical reference models as source/license verification pending. Some are reference-only, so a release-specific dependency inventory is necessary before deciding which actually ship. Do not upload the entire workspace, reference-library, browser profiles, backups, or handoff directories. The 2026 terms require rights and appropriate license documentation and specify open availability/OSI licensing for original content, with an Apache 2.0 default when none is specified. Choosing a license for original work does not clear third-party assets. No rights were granted or changed by this update. Source: https://www.spaceappschallenge.org/legal/
- Pre-event development. This project predates the November 14–15, 2026 event. Preserve and disclose that history and AI assistance. A legacy FAQ asked participants to begin actual challenge work at the event, but it is a 2022 document and cannot establish the 2026 policy. Confirm how this pre-existing game may be used with the 2026 organizers before presenting it as event-created work. Sources: https://www.spaceappschallenge.org/ and https://legacy.spaceappschallenge.org/resources/faq/
- Submission itself. Registration, team eligibility, public deliverable, project page, deadline and final challenge-specific checklist have not been verified from this workspace. This review does not submit or publish anything.

## Physics reviewed

| System | Finding | Status |
|---|---|---|
| Earth/Moon orbits | Elliptic Kepler solver, correct SI gravitational parameters, conserved two-body energy and angular momentum | Verified across 1,280 sampled states |
| Reference frames | Prograde/retrograde inclination, body rotation, fixed/inertial transforms and deployment continuity | Existing and new tests pass |
| Eclipse/contact | Cylindrical shadow and spherical-body line of sight; sampled station masks | Valid approximation; no penumbra/refraction |
| Night instruments | Previously rounded a mixed sunlight interval using its endpoint | Fixed to use dark interval fraction |
| Orbit preview | Globe did not rotate alongside the time-accelerated satellite | Fixed to use the same simulated time |
| Launcher engineering | Ideal rocket equation, serial stage masses, parallel boost effective impulse, TWR | Valid ideal estimates; fixed ascent-loss allowance |
| Transfers | Hohmann time and endpoints, local capture equation, hyperbolic escape | Verified educational model, not ephemeris navigation |
| Lunar opportunity | Used sidereal month as recurrence | Corrected to approximately 29.53-day synodic recurrence |
| Energy | Inverse-square solar output and specified exponential electrical decay | Verified; 45-year decay is a fictional system assumption, not Pu-238 half-life |
| Data/propellant | Storage conservation, delayed receipts, rocket equation | Verified; negative/non-finite burn inputs rejected |

## Major scientific limitations retained

1. Ascent is authored animation, not thrust/mass/drag/gravity integration. Rocket construction affects engineering gates, not an integrated aerodynamic trajectory. Finite burns, steering losses, loads and realistic launch failure modes require a larger simulator change.
2. Transfers assume circular coplanar orbits and scenario dates. Window penalties are authored guidance allowances. Europa does not resolve Jovian capture or moon-relative targeting; comet encounters omit full inclined geometry. Communications use conservative maximum distances. These are now clearer in planning text.
3. Sun-synchronous presets omit J2 precession. Long-term drag, perturbations and stationkeeping are not propagated. Current two-body results are suitable for short educational operation windows.
4. Survey coverage means useful observing time, not geographic footprint. Thermal/radiation incidents and fixed-mass avoidance responses are gameplay abstractions; avoidance burns do not change orbital elements. A geographic science/attitude/thermal/dose model is a major redesign.
5. Proxima assumes speculative external beaming and future lifetime/optical hardware. It is not achievable by ordinary fuel upgrades. Keep its speculative label prominent.

These are scientific limitations, not individually proven competition-rule violations. Present the game as an educational trade-off simulator.

## Visual changes

Unified flight-deck typography, controls, panels and responsive sheets; larger campaign tiles and spacing; labelled celestial map markers and scale notices; seeded isotropic stars; shared mapped Earth with night-side-gated historical lights and restrained sun-dependent atmosphere; darker space illumination; preserved studio lighting in the workshop. Earth clouds remain a documented composite, not a separate weather simulation. Existing local asset credits remain applicable.

## Verification

Passed program.test.mjs (all 28 reference contracts, migration, rewards, API fallback), flight-continuity.test.mjs, orbital-geometry.test.mjs (8,028 assertions), orbital-operations.test.mjs (735 assertions), physics-audit.test.mjs, and program-browser.test.mjs (Academy, keyboard/mobile, custom Mars and Earth flights, pause/reload, camera changes and rewards). Visual screenshots are in artifacts/realism. No claim of exhaustive verification of every possible user blueprint or physical regime.

Physics references: https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/ ; https://www.jpl.nasa.gov/edu/resources/lesson-plan/calculating-solar-power-in-space/ ; https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/
