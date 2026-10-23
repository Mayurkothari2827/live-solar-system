# Science Atlas verification — 23 October 2026

## Implemented
- Corrected vertical orbit dragging in solar and deep-space scenes, preserving horizontal behavior and pole clamps.
- Added a lazy-loaded Science Atlas on both pages: world profiles, physical properties, latitude-dependent rotation speed, pairwise solar-system ranges and light times, sourced cosmic field guide, and an interactive Schwarzschild relativity model.
- Current ranges use existing JPL state vectors at the simulation UTC, including parent-relative moon velocities composed into the common frame. No replacement ephemeris or synthetic current deep-space positions.
- Distinguishes live, paused, playback, unavailable and expired states. Reference properties and idealized relativity calculations are explicitly labeled.
- Atlas refreshes at 1 Hz only while visible; metric nodes are reused. Covered solar rendering is throttled and covered deep-space rendering is suspended. No additional WebGL context.
- Added static server, offline shell and native web-bundle asset integration.

## Verified
- `npm test`: 88 passing JavaScript tests, including drag direction with actual Three.js math, common-frame Moon range, expiration, frame throttling, rotation, light time, illumination, escape speed and relativistic limits.
- `python3 -m unittest discover -s tests -p 'test_*.py'`: 5 passing tests.
- `npm run build`: passed.
- `npm run build:native`: passed (Capacitor web bundle, not a native binary build).
- `git diff --check`: passed.
- Local browser: updated through the service-worker update UI; Moon reference properties and valid Earth–Moon geometry displayed, pulsar search worked, paused measurements said “Paused model”, relativity controls updated values, and modal close restored focus.
- Browser error log contained no errors at the final check.
- Compact portrait, larger portrait and short landscape layouts inspected. Browser viewport overrides were affected by browser scaling (observed CSS viewports 327×727, 391×847 and 767×354); these are browser checks, not physical-device tests. Atlas had no horizontal overflow in the portrait checks; landscape used internal scrolling with navigation retained.
- Evidence: `qa/science-atlas-mobile.jpg`.

## Limits and remaining verification
- Some upstream body records were unavailable during local QA. Their ranges remained unavailable rather than being replaced with guessed live values. The selected Earth and Moon records were valid.
- No physical-device FPS, thermal, battery or GPU-memory claims are made. Rendering suppression is covered by automated tests; complete smoothness on every device is not established.
- The native web-bundle build passed. No Android/iOS compilation or signing was performed for this change.
- Scientific reference sources and retrieval/review dates are linked in the Atlas. “Nearest” claims are scoped (e.g. nearest large galaxy, nearby millisecond pulsar), not universal rankings.
- No commit, push or deployment performed for this change. Existing kernel modification was left untouched.
