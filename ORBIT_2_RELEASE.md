# ORBIT 2.0 implementation and release notes

All changes are local. No commit, push, deployment, store submission or signing was performed for this brief.

## Audit and architecture

The repository is a static HTML/CSS application with Three.js r160 renderers and a Python Horizons/SPICE API, deployed through an explicit Vercel static build. No framework migration was needed. The position and orientation calculations, moon-parent composition, reference frames and ephemeris bounds remain in the existing engine. A small renderer interface (`window.ORBIT`) lets the shared experience UI select, inspect, restore and capture scenes without duplicating astronomy calculations.

The existing issues addressed were missing cross-explorer navigation/search, no saved discoveries, no reproducible scene links, no native project, and a fixed graphics profile. The original advanced timeline, physical scale selection and source notes remain accessible. The automatically refreshed Earth kernel that was already dirty was left out of this work.

## Implemented

- Shared mobile-first Explore panel with Explorer/Science modes, profile explanations, source validity, optional local time and scientific vectors. Planet vectors are converted back to ECLIPJ2000 axes; moon vectors are relative to their parent. Calculated planetary osculating elements use the existing two-body orbit-guide helper and are labeled accordingly.
- Searchable directory of the 30 included solar bodies, bundled galaxies/black holes and 320 confirmed exoplanet hosts. The solar directory contains reference metadata only, exported from the same NAIF setup as the API.
- Immersive full-screen presentation, camera reset, eased orbit-camera movement, existing pinch/zoom and touch selection, solar double-tap focusing, and a swipe-down Explore sheet handle. Reduced motion retains immediate transitions. Deep-space layer selection and recorded-image views remain intact.
- Low, Balanced and High graphics options. Solar geometry changes share one sphere mesh across bodies: 40×24, 64×40 or 112×72 segments. Resolution, texture budget and rendering caps change independently of ephemerides. Balanced solar rendering retains its adaptive pixel reduction. High allows up to 60 draws per second; this is a cap, not a device FPS guarantee.
- Seven manual guided journeys with linked sources, next/previous, pause/resume, exit and locally saved progress. Cross-page journeys retain their step in the navigation URL. Tour pause pauses progression; time simulation has its own controls.
- Comparisons with truly proportional reference-radius circles, published JPL planet mass/gravity/sidereal periods, and included-moon counts. Unknown properties explicitly say unavailable. Moon mass/gravity, atmosphere and temperature are not added from unsourced values. JPL uncertainties and original references remain linked.
- Local discoveries, up to 20 saved camera scenes, safe query links, preserved saved UTC and graphics/mode preferences. Saved UTC outside the loaded window is refused. Screenshot capture shares/downloads the 3D canvas; DOM labels and panels are excluded, so use scene links for scientific context. Cloud accounts are not required.
- PWA shell version advanced for the new files and catalogs. The existing bounded cache and current-UTC expiry checks remain. Download clearing retains the app shell and discoveries. Real telescope images remain online-only.
- Capacitor 8.5.3 Android and iOS projects, local bundled app (about 17 MiB of web assets), native sharing, private downloaded ephemeris files, app lifecycle suspension, Android back handling, orientation-safe layout, context-restoration handling, and ORBIT icons/splash artwork. No remote `server.url` is used. Bundled pages/catalogs/optimized maps work without a website download; current planet data require a valid downloaded response or connection to the astronomy API.

## How to run

### Website

Install `requirements.txt` in a Python environment, then run `python3 server.py`. Open `http://127.0.0.1:8770/`. `npm run build` prepares `public/` for the existing Vercel configuration. Restart the Python server after route changes. If an older PWA controls the browser, use App → Update & reload. No deployment was made for this brief.

### Native bundle and projects

Use Node 22 or newer. Run `npm ci`, then `npm run sync:native`. This creates `native-public/` and copies it into both platforms. The build retains texture/license credits and bundles optimized maps, not original large desktop textures. Native High still uses the packaged 2k maps. Changes to web sources require another sync.

- Android: install Android Studio, Java 21 and Android SDK 36. Run `npm run android`, select a device/emulator and build in Android Studio. For a command-line debug build: `cd android && ./gradlew :app:assembleDebug`.
- iOS: install Xcode and its required iOS platform/simulator. Run `npm run ios`, select a simulator and Run. Physical-device builds need an Apple team and signing. The project uses Swift Package Manager.

The native API backend is explicitly configured in `native/bridge.js`. It calls the existing HTTPS `/api/catalog` and `/api/ephemeris?id=…` endpoints through CapacitorHttp, so no browser CORS exception or broad navigation allowlist is added. Native downloads validate their original UTC start/end before fallback. Native app storage may be cleared through Explore.

`python3 scripts/export_directory.py` refreshes the solar metadata after installing the Python dependencies and kernels. `python3 scripts/native_artwork.py` regenerates native artwork from the shared icon (requires Pillow). The artwork is already generated.

## Validation and limits

- Baseline: 42 JavaScript tests and five Python tests passed.
- Expanded JavaScript suite: 53 tests passed, including local-storage corruption/full-storage handling, share-link round trips, scene UTC guards, current-UTC expiry reporting, graphics changes, tour pause/progress, directory navigation and app lifecycle suspension.
- Static and native web bundles built; Capacitor generated and synchronized both platforms with App, Filesystem, Share and SplashScreen plugins.
- Android debug build attempted: blocked because no Java runtime is installed. Android Studio was not present in the inspected applications.
- iOS simulator build attempted: Swift packages resolved, then blocked because the required iOS 26.5 platform was not installed in Xcode. No signed or simulator binary is claimed.
- Browser/device visual QA and actual hardware FPS measurements are outstanding. Existing session browser access restrictions prevented local visual automation; mocked renderer tests do not compile shaders or measure real GPU performance. The science panel exposes recent solar draw rate for later device measurement.
- WebGL context restoration, native sharing, gestures, installation and background transitions require device verification. Native optional haptic feedback is not implemented. Shared production scene URLs need the matching ORBIT 2.0 website deployed before their new query parameters can be restored there. Cross-explorer navigation still changes pages; a continuous single-scene fly-through is not implemented. Saved views are explicit; the app does not silently restore a historical epoch on every launch.
- No approximate observational uncertainty bounds were invented. Missing comparison properties remain unavailable; existing live solar interpolation validation remains in `validation.json`.

## Before app-store submission

Install the missing build tools, run real-device QA (including offline expiry and reconnection), verify native sharing/capture and context recovery, choose final bundle IDs and versioning, configure release signing, and prepare store descriptions/screenshots/privacy disclosures and attribution. Native projects contain no account or tracking feature. App/Play Store submissions were not performed. Review bundled asset licenses for the intended distribution and retain credits.

Dependency audit: the development xcode package uses an override to UUID 11.1.1 for its advisory fix; `npm install` reported zero vulnerabilities after that compatible change. Native sync was rerun successfully.

## Final verification follow-up

See [RELEASE_VERIFICATION.md](RELEASE_VERIFICATION.md) for the subsequent actual build results, fixes, API checks and exact real-device installation steps. Java 21 and SDK 36 are now installed in a workspace-local toolchain. The Android debug app build has succeeded and its APK signature/assets were verified. Earlier missing-Java notes above describe the first attempt and are superseded. The iOS app minimum is now 15.4, matching HTML dialog support; the required Xcode runtime is installed and the ARM64 simulator build has succeeded. Both debug APK and simulator archive are available under release-artifacts. Device interaction/performance/offline QA remains incomplete because of the documented emulator and UI-tool limitations. No publishing action was performed.
