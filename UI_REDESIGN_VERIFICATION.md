# ORBIT UI redesign verification — 12 October 2026

Implemented directly in the existing static application, using the supplied mobile reference. No framework, new dependency, generated texture, or replacement astronomy model was introduced. No commit, push, deployment or store submission was performed.

## Changes

- Scoped navy/cyan presentation tokens and responsive mobile, tablet, desktop and landscape layouts in `orbit-ui.css`.
- Real Three.js scene retained as the central view; close-up camera fitting gives the body more space. Solar lighting, geometry, orientation, interpolation and adaptive quality calculations remain intact.
- Header search/settings, sourced texture previews, planet selection, All planets, Space navigation and the complete advanced explorer menu.
- Share and saved-discovery shortcuts use the existing web/native controllers. Ecliptic-north camera control and the existing zoom/fit controls remain functional.
- Close-up, Moon system and Top view segmented controls; four sourced measurement cards; compact UTC module and functional mobile Time controls button.
- Equatorial radius remains explicitly equatorial (Earth 6,378.1 km), not the screenshot's mean-radius value. Periods convert the existing JPL reference years to Julian days. Moon distance cards use heliocentric distance, not the parent-relative orbital radius. Temperature remains Unavailable because the dataset supplies no temperature measurement.
- Live status requires valid data covering current UTC and a simulation epoch within five seconds of current UTC. Pause/playback/data-state mutations update the badge immediately. Unavailable and expired records never qualify as Live now.
- The native backdrop/offline code, science modes, directory, comparisons, tours, storage, saved scenes and deep-space experience remain in place.
- PWA shell version advanced to v5 to include the new presentation files. Existing installed web apps require accepting the normal available-update action.

## Verified

- 78 JavaScript tests pass (`qa/ui-redesign-tests.log`). Includes presentation validity, missing measurements, delayed-catalog thumbnails, shortcut delegation, moon heliocentric distance and explicit clock state. Existing engine, gestures, offline, native bridge, sharing, lifecycle and context-recovery regressions remain covered by mocked runtime tests.
- 5 Python tests pass (`qa/ui-redesign-python.log`).
- Static website build and earlier `npm run sync:native` passes are recorded. Final incremental bundle refresh reused unchanged assets from the verified iOS build after repeated local metadata/copy stalls; final HTML/JS/CSS bytes are verified in public, native-public, Android and iOS outputs (`qa/ui-final-bundle-verification.json`). No native plugin configuration changed. A later redundant full asset re-copy/Capacitor sync was stopped when it stalled.
- Unsigned arm64 iOS Simulator compilation passes (`qa/ui-redesign-ios-build.log`). Build output: `/tmp/orbit-ui-ios/Build/Products/Debug-iphonesimulator/App.app`.
- Actual iPhone 16e simulator portrait and landscape screenshots were inspected through native desktop capture. The restored Moon-system selection, Earth close-up and live JPL position state rendered; reference radii/periods and unavailable temperature were displayed. Final compiled portrait and landscape captures were inspected; `qa/ui-redesign-earth.png` records the final compiled live Earth close-up; metric cards, UTC controls and dock remain fully visible without overlap. `qa/ui-redesign-landscape.png` retains the simulator framebuffer orientation. An intermediate Earth close-up revealed a loading notice crowding the dock; portrait layout was then adjusted to reserve a fixed dock, fit the dashboard above it, and allow short-screen content to scroll. Capacitor iOS receives a platform-specific correction because its WebView already reserves the home-indicator area. This is not a claim of pixel-perfect matching or a physical-device test.
- Visual inspection identified and corrected a delayed-catalog/manifest thumbnail bug, an unsupported clock glyph, unwanted filled dock buttons, and portrait dock crowding. The header thumbnail recovery also has an automated regression test.

## Local environment repairs and remaining limits

Native compilation exposed numbered duplicate files in local dependencies and an Android config resource. Only byte-identical copies were quarantined, preserving canonical SDK files; receipts are in `qa/ui-*-repair.json` and backups under `/tmp/orbit-duplicate-dependencies`. These were local duplicate-file problems, not changes to astronomy or SDK implementations.

Android build attempts then encountered unreadable Gradle module metadata in the local toolchain cache. The single reported descriptor directory was quarantined for regeneration. A second unreadable Netty descriptor was also found; the generated metadata directory was preserved under its dated quarantine name and dependency metadata regeneration was attempted but stalled without build output and was stopped. No new Android APK is verified for this redesign; the existing APK predates the UI. See `qa/ui-redesign-android-build-summary.txt` for the actual retry result; the previous descriptor failures are toolchain cache failures, and the stopped retry is not a successful build.

Native desktop input fails with `noWindowsAvailable`; the user explicitly authorized iOS Simulator CLI launch and screenshot capture as a fallback. The second iPhone simulator launch was severely delayed, so its early home-screen capture does not establish an ORBIT visual pass. Desktop browser automation was previously security-denied and was not bypassed. Desktop/tablet/very-small-phone layout CSS is implemented but needs interactive visual confirmation. No physical Android/iPhone tests or real-device performance measurements were performed in this redesign pass. Existing asset-license clearance and production signing gates remain documented in the release checklists.
