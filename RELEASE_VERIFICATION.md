# ORBIT 2.0 release verification — 11–12 October 2026

This is a local verification record. No commit, push, deployment, release signing or store submission is authorized or performed. The pre-existing Earth kernel change is preserved.

## Confirmed fixes

- iPhone landscape QA exposed header buttons covering Space and Fit overlapping Top view. Explore/App now stay in the landscape flex row, and the view toolbar accounts for the right safe-area inset.
- Native bridge logging is disabled: debug plugin responses were printing whole ephemerides. Mobile controls disable text selection, after a delayed emulator touch opened the selection menu over Explore.
- Lowering solar graphics quality invalidates and disposes maps above the new texture budget, including normal maps. Previously only geometry and pixel density changed, leaving high-resolution maps resident. Astronomical state and interpolation are unchanged.
- Native Android Back closes the App dialog before leaving deep space.
- Native and PWA per-body downloads validate body identity, finite seven-column state samples, monotonic sample times, actual sample coverage, and current-UTC start/end. Expired, malformed or wrong-body records cannot be cached as current data. Fresh web responses clear the cached-data banner.
- Native fetch preserves external request routing, rejects unsupported methods/invalid body paths, and reports cancellation promptly and compares protocol/host for iOS custom-scheme routing. The native HTTP transport itself has no cancellation API; a transport already in flight finishes in the background, but its aborted response is ignored and not cached.
- Native cache writes and deletion are serialized. The PWA clears through the worker, acknowledges completion, and invalidates requests started before the clear while retaining shell pages. Clear downloads invalidates earlier requests so they cannot repopulate storage. Storage errors reach the UI. Its message correctly distinguishes downloaded ephemerides from bundled maps.
- Native Share cancellation uses the pinned plugin's `Share canceled` response as well as browser AbortError, so canceling does not display a spurious failure.
- Native image sharing uses a dedicated cache folder. Android FileProvider exposes only that folder, instead of the default broad external-storage/cache paths.
- Added the app's iOS FileTimestamp privacy manifest (C617.1) and included it in the resource build phase, as required by Capacitor Filesystem: https://capacitorjs.com/docs/apis/filesystem#apple-privacy-manifest-requirements . This is an API-use declaration, not certification of App Store approval.
- Native bundling retains the linked README, root and optimized credits, available individual texture license files, Celestia notes and license texts. PWA shell version advances to v4 for these fixes.
- Pin Android build tools 36.0.0 across application/library modules; the default attempted an unnecessary missing 35.0.0 download despite installed 36.0.0. The build subsequently reached actual Java/resource tasks.
- Gradle remains 8.14.3; its wrapper now downloads the binary distribution without the unnecessary documentation/source archive and pins the official distribution SHA-256.

## Evidence and coverage

Automated renderer tests use Three.js geometry/math with a mocked renderer. They check mobile budgets, resource disposal, background suspension, camera/scene restoration, state-derived orbit guides and current-UTC expiry. They do not compile shaders or measure hardware FPS. Experience tests cover directory navigation, modes, tour state, comparisons, saved views and local-storage failures. Native bridge tests mock the plugins; PWA tests mock the worker's Cache API. These are logic verification, not claims of device validation.

A real HTTPS download from `https://live-solar-system.vercel.app/api/ephemeris?id=399` returned Earth ID 399, DE441 source, 577 state samples, and a window containing the verification UTC (start 1791676800, end 1791849600). This verifies one public endpoint at that time; it is not a guarantee of future API availability. Offline records retain their original times. Deep-space catalogs and telescope imagery are recorded observations/reconstructions, not current orbital phases or a live camera.

Android `./gradlew :app:assembleDebug` succeeded (148 tasks; final incremental run 1 second, 21 executed). The APK is `android/app/build/outputs/apk/debug/app-debug.apk`, also copied to `release-artifacts/ORBIT-2.0.0-debug.apk` (20,630,879 bytes). APK v2 signature verification succeeds; main scripts and CSS byte-match the final native bundle, and actual bundled loggingBehavior is `none`. SHA-256: `770761de09072f1d10224da86c1a5aab3b154b7e5948c76d0669e139fd51b9e1`. Package ID/version/min/target were read from the APK: `com.orbit.observatory`, 2.0.0 (1), minimum 24, target 36. Besides INTERNET, AndroidX adds a signature-level receiver-protection permission. This does not request user access to location/camera/microphone/storage.

The final ARM64 iOS Simulator `xcodebuild` exited 0 with **BUILD SUCCEEDED**, using Xcode 26.6, SDK 26.5 and `CODE_SIGNING_ALLOWED=NO`. The required iOS 26.5 simulator runtime was downloaded through Xcode; its earlier absence caused a platform-not-installed failure, not an application compilation error. Output: `/tmp/orbit-ios-verify/Build/Products/Debug-iphonesimulator/App.app`. A portable archive is `release-artifacts/ORBIT-2.0.0-ios-simulator.zip` (18,173,941 bytes; ZIP integrity check passed). SHA-256: `48acdb04bc98ad36a24b1cde96f5b93b7f5ff4d1286dea54f5107bc021375c8d`. Actual Info.plist reports `com.orbit.observatory`, 2.0.0 (1), minimum iOS 15.4. Scripts/CSS match the current bundle, logging is `none`, and the app privacy manifest is included. This is a simulator build, not a signed physical-device/archive build.

Final `npm test`: **64 passed, 0 failed**. One earlier static-copy test timed out under host/filesystem contention; its isolated rerun and the subsequent full suite passed without changing its timeout. Final Python API suite: **5 passed**. Static build and native web bundle/sync succeeded. Final logs and Android Earth screenshot are retained in the ignored `release-artifacts` folder. iOS screenshots were captured inline through the desktop UI tool. Real Moon and catalog downloads also succeeded: 30 catalog bodies, 577 Moon states, 2,881 rotation quaternions, with maximum quaternion normalization error 1.24e-12. A later Mars check returned HTTP 200 with 577 samples covering current UTC.

## Release configuration reviewed

- Android application ID / iOS bundle ID: `com.orbit.observatory`. Confirm this is the desired unique store identity before creating listings/signing profiles.
- Version: `2.0.0`, Android versionCode / iOS build number `1`. Increment build numbers for later uploaded builds.
- Capacitor CLI requires Node 22 or newer. The installed Node 22.14.0 and 26.7.0 meet that requirement. A misleading version error during verification came from unreadable local semver module files; reinstalling the exact locked npm dependencies restored the check and native sync. Dependency audit reported zero vulnerabilities.
- Android minimum API 24, compile/target API 36; Capacitor 8.5.3; Java 21; AGP 8.13.0; Gradle 8.14.3. Android INTERNET permission only; no location, microphone, camera or public storage permission is requested.
- iOS app minimum 15.4, matching native HTML dialog support (https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/). Capacitor dependencies may retain their own lower minimum. App icon catalog contains the 1024×1024 ORBIT icon. Android launcher variants and native splash artwork are present. Both portrait and landscape are configured. Artwork still needs installed-device appearance checks.
- No release keystore, Apple signing team or distribution credentials are created. Debug signing is for testing only.
- No account, ad SDK or analytics feature was added. Preferences, discoveries and native downloads are stored locally. Remote astronomy/image requests reach the configured hosting/provider services; operators must review their logs/retention and disclose that behavior. A final public privacy-policy URL, operator contact, store Data Safety/App Privacy answers and store screenshots remain publisher tasks.
- Asset credits include CC BY, CC BY-SA and assets with Celestia/default licensing metadata. Individual `.license` files cover only those supplied by the upstream repository. Remaining files rely on the accompanying upstream notes; this audit does not invent permissions for them. Review GPL/default-content and ShareAlike obligations and source availability for the intended store distribution before submission. No blanket commercial/store-license clearance is claimed.
- The public website is not updated by this local work. New native shared scene links need the matching website deployed after permission is granted.

## Real-device installation

### Android

From this repository, use Java 21 and the installed workspace SDK:

```bash
export JAVA_HOME='/Users/mayur/Documents/Codex/orbit-toolchains/jdk-21.0.12.1+1/Contents/Home'
export ANDROID_HOME='/Users/mayur/Documents/Codex/orbit-toolchains/android-sdk'
export GRADLE_USER_HOME='/Users/mayur/Documents/Codex/orbit-toolchains/gradle'
npm run sync:native
cd android
./gradlew :app:assembleDebug
```

After a successful build, the APK is `android/app/build/outputs/apk/debug/app-debug.apk`. Enable Developer options and USB debugging on the phone, connect USB, and accept its computer authorization prompt. Then, from the repository root:

```bash
/Users/mayur/Documents/Codex/orbit-toolchains/android-sdk/platform-tools/adb devices
/Users/mayur/Documents/Codex/orbit-toolchains/android-sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

The device must appear as `device`, not `unauthorized`. Open ORBIT from the launcher. A signature mismatch with a previously installed app needs the original signing key or a deliberate uninstall (which deletes its local discoveries/downloads). Do not uninstall automatically. For USB-free testing, transfer a successfully built debug APK to the phone and explicitly allow that file source to install it.

### iPhone

Run `npm run sync:native`, then `npm run ios`. In Xcode, select the App target → Signing & Capabilities → choose your Apple Development team and enable automatic signing. Connect the iPhone, trust the Mac and enable Developer Mode when iOS requests it. Select that iPhone as the run destination and choose Product → Run. Resolve any unique bundle-ID/profile requirements with your own Apple account. No signing credentials are fabricated. A simulator `.app` cannot be installed on a physical iPhone; a physical build signed for that device is required. Distribution/TestFlight needs the publisher's Apple Developer setup.

## Device QA required before release

Actual iPhone 16e / iOS 26.3 simulator startup rendered the textured Earth, loaded JPL data and advanced the UTC clock. Both portrait and landscape were captured through the desktop tool. The final build was reinstalled; a fresh landscape screenshot confirmed Space/Explore/App and Fit no longer overlap. Its coordinate input returned `noWindowsAvailable`, although toolbar rotation and screenshots worked; full iOS sheet/gesture/sharing interaction could not be certified through that tool.

Android 16 API 36 ARM64 emulator installed and opened the debug APK, rendered Earth, downloaded native API data and persisted private `files/ephemeris` records (including Earth, Moon, Mars' moons and Jovian bodies). Initial host/guest instability produced a system-process ANR; restarting with a 1,536 MiB budget and SwiftShader allowed app startup. System service/input stalls and meminfo timeouts continued. Offline startup was attempted, but no completed offline UI result was obtained; it is not a passed check. Native HTTP responses for Earth/Moon and a separate valid Mars HTTPS response were observed. A partial-data notice remained visible during background loading/retries. No trustworthy physical-device FPS, GPU, thermal or memory-leak measurement is claimed from this emulator.

Logic tests cover the remaining features, cancellation, expiry and cache races. Full installed-device checks remain necessary for tours, comparisons, save/restore, share-sheet cancellation, safe-area sheets, gestures, lifecycle, offline expiry/reconnection and WebGL recovery. These are verification gaps, not proven code failures. Desktop localhost browser automation was security-denied; it was not bypassed.

Test both observatories on common iPhone/Android portrait and landscape screens. Check safe areas, text, sheets, scrolling, at least 44px touch controls, pinch/drag/tap/double-tap, camera navigation, tours, comparisons, saving/restoring/sharing, and native Back/lifecycle. Use real source windows: valid offline startup, out-of-window startup, reconnection and cache clearing. Verify WebGL context loss/restoration and screenshot sharing. Record real draw rates, GPU/memory behavior and thermal/battery use; repeat after switching High → Low. Do not infer actual performance or visual correctness from mocked tests.

## Production-preparation follow-up — 12 October 2026

This follow-up made no native rebuild, signing, deployment or submission. Existing APK/simulator archives remain the previous baseline and **do not contain the new source patch or SDK notices**.

A reproduced retry-starvation defect is fixed in `app.js`: failure cooldowns, healthy/unattempted bodies before failures, oldest-failure-first retries and immediate online reset. Regression tests cover both immediate failures and 55-second timeouts plus delayed polling. Current-frame interpolation, astronomy samples, cached validity and SPICE data were not changed. Additional mock-based checks cover native share-file scope/cancellation, app lifecycle, drag/pinch/cancel in both observatories and context lost/restored state. Final source suite: **72 JavaScript tests / 5 Python tests passed**. Logs are `qa/javascript-tests.log` and `qa/python-tests.log`.

A recorded live probe of all 30 API bodies passed state identity/finiteness/time coverage/current-UTC checks; 29 supplied rotation datasets passed quaternion norm/time coverage checks. One unsupplied rotation was left unavailable. This is a point-in-time service/data-structure check, not independent astrometric ground truth. See `qa/live-api-results.json` for UTC and per-body evidence.

Device inventories found zero connected physical Android phones and zero physical iPhones. No real-device tests/performance results are claimed. Earlier emulator system ANR/host contention and simulator input-tool limitations remain distinct from the reproduced application defect. No host-only fix was invented.

The expanded asset audit enumerates 153 imagery/metadata/resource entries. It identifies **12 unresolved original maps / 24 bundled derivatives**, **5 ShareAlike sources / 10 derivatives**, and publisher ownership/remote-image/dataset obligations. Four complete pinned Capacitor MIT texts and an SDK notice index are preserved for future packaging after the prior binary was found to have only its short SDK MIT banner. Static packaging regression checks the new notices; no existing native archive was altered.

Use DEVICE_TESTING_CHECKLIST.md, EMULATOR_INVESTIGATION.md, ASSET_LICENSE_AUDIT.md, PRODUCTION_RELEASE_GUIDE.md and FINAL_RELEASE_CHECKLIST.md for the remaining gates. Current launch decision remains **do not publicly launch** until physical-device acceptance, per-file rights, export attribution, privacy disclosures, publisher signing and final-candidate validation are complete. Commands are prepared; credentials and release-signing results are not invented.
