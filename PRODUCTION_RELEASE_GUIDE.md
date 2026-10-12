# Production preparation — commands only, not executed

Reviewed 12 October 2026. No native compilation, signing, credential creation, deployment, upload or store submission was performed in this follow-up. Existing debug binaries predate the source retry fix. This guide prepares a future candidate; it is not a successful release-build receipt.

## Configuration reviewed

| Item | Existing value / finding | Release decision |
|---|---|---|
| Android applicationId / namespace | `com.orbit.observatory` | Publisher confirm availability and ownership before a listing |
| iOS bundle ID | `com.orbit.observatory` in Debug/Release | Same identity; no associated-domain/universal-link entitlement configured |
| Version / build | `2.0.0` / Android code `1` / iOS build `1` | Must be greater than any previously uploaded build number; do not invent store history |
| Android platform | min API 24, compile/target 36, build tools 36.0.0 | Check submission-date Play policy again; prior debug build verified |
| Java / Gradle / AGP | Java 21, Gradle 8.14.3, AGP 8.13.0 | Workspace tools installed; wrapper distribution SHA pinned |
| iOS / Xcode | min 15.4; prior ARM64 simulator build used Xcode 26.6 / SDK 26.5 | Physical archive/signing not verified |
| Capacitor / Node | 8.5.3; CLI Node >=22 | Installed Node 22.14.0 meets requirement |
| Native backend | Explicit HTTPS `https://live-solar-system.vercel.app`; no `server.url` | Current website is not this local candidate; shared scene links need matching web behavior before public launch |
| Logging / WebView | `loggingBehavior=none`; no added inspection/debug production option | Confirm actual candidate after future build |
| Android release | minify disabled; no release signingConfig | Preserve working code; unsigned CLI output is not distributable until publisher signing |
| Android permissions | Source manifest INTERNET; prior APK also AndroidX signature receiver protection | No camera/microphone/location/public-storage permission requested; inspect final merged manifest again |
| Exported Android components | Launcher Activity exported; FileProvider not exported, URI grants scoped to cache/orbit-share | Intentional launch/share surface; no web app-link filter implemented |
| Backup | Android `allowBackup=true`; normal iOS backup behavior | Publisher privacy disclosure must account for OS backup/restore; no claim data can never leave the phone |
| iOS privacy | FileTimestamp C617.1; no tracking/collected-type declarations; no sensor usage prompts or ATS bypass | Review app + every SDK + operator/provider logging against final privacy answers |
| Artwork | Four icon PNGs plus 30 generated native PNGs | Publisher ownership review + installed-device visual QA required |
| Native code alignment | Prior APK contains no bundled `.so` libraries | Does not establish all-device compatibility; repeat package and OS checks for final dependencies |

IDs, versions and permissions were inspected in source and prior compiled artifacts; they were not reserved/changed in a store. No Apple team/profile or release keystore exists in project configuration. Absence of signing credentials is not an application compilation failure.

## Before any future build

Close license, privacy and physical-device gates in `FINAL_RELEASE_CHECKLIST.md`. Use the repository root and a Node 22+ shell. Then, only when a new build is authorized:

```bash
export JAVA_HOME='/Users/mayur/Documents/Codex/orbit-toolchains/jdk-21.0.12.1+1/Contents/Home'
export ANDROID_HOME='/Users/mayur/Documents/Codex/orbit-toolchains/android-sdk'
export GRADLE_USER_HOME='/Users/mayur/Documents/Codex/orbit-toolchains/gradle'
node --version
npm ci
npm test
python3 -m unittest discover -s tests -p 'test_serverless.py'
npm run sync:native
```

Save candidate hashes, source revision/patch, test logs, dependency licenses and the asset inventory. Direct SDK notice texts are prepared in SDK_NOTICES.md / LICENSES; inspect their inclusion and complete transitive notices in the future native candidate. Never put passwords or keystores in the repository or chat. Do not delete existing discoveries to resolve a signature mismatch without a deliberate user decision.

## Android unsigned release commands

The following tasks compile release variants without a configured release key. They are preparation commands, **not run here** and not evidence of a successful AAB/APK:

```bash
cd android
./gradlew :app:bundleRelease :app:assembleRelease
```

Default expected paths: `android/app/build/outputs/bundle/release/app-release.aab` and `android/app/build/outputs/apk/release/app-release-unsigned.apk`. Confirm actual output/task results. An unsigned release APK cannot be installed; an unsigned AAB is not ready for Play upload.

For publisher-controlled signing, open the existing Android project in Android Studio → Build → Generate Signed Bundle / APK → Android App Bundle (Play) or APK (direct distribution) → select the publisher's existing keystore and alias. If none exists, the publisher must create and securely back up its own upload key through that workflow. Enter passwords locally; record the certificate fingerprint and recovery process. Choose the release variant. This agent has not created a key or executed the signing step. A signed direct APK should be checked with `apksigner verify --verbose`; an upload AAB needs its upload-key signature verified. Use Play App Signing according to the publisher's account setup. Keep signing keys consistent for updates; changing them can prevent installation over a prior version.

Authoritative reference: [Android app signing](https://developer.android.com/studio/publish/app-signing). No upload, rollout or store interaction is authorized by this document.

## iOS unsigned archive preparation

From the repository root, a future unsigned physical-platform archive can be attempted without selecting a team:

```bash
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$PWD/release-artifacts/ORBIT-unsigned.xcarchive" \
  CODE_SIGNING_ALLOWED=NO archive
```

This command was not executed. Its unsigned result, if successful, is not installable on an iPhone and is not a distributable IPA.

For a device candidate, open `ios/App/App.xcodeproj`, select App → Signing & Capabilities → the publisher's Apple team and the final bundle ID. Connect/trust the iPhone, enable Developer Mode, choose the physical device and Product → Run. For an eventual distribution archive, select a generic physical iOS destination and Product → Archive using publisher-controlled distribution signing/profile settings. Use Organizer validation/export only when separately authorized; **do not select upload/submit** under this task. Export-method/profile options depend on the chosen distribution channel and account; none are fabricated here. Simulator ARM64 `.app` files cannot substitute for a physical signed build.

Verify actual entitlements, provisioning profile, identifier, version, permission usage strings, required-reason manifests and dependency signatures in the resulting candidate. Simulator build success does not prove these distribution checks.

## Privacy and listing preparation

The app stores preferences, discoveries, saved scenes and downloaded ephemerides locally. Android backup is enabled. Native/browser requests expose ordinary network metadata to the configured backend and remote observation hosts. Their logging/retention practices are not established by this code audit. Native sharing transfers the chosen link/image to a user-selected OS target. No account, ad SDK or analytics feature was found; that does not determine the publisher's complete data-safety answers.

Publisher must provide a public privacy-policy URL, operator name/contact, retention/deletion/backup explanation and correct Play Data Safety / Apple App Privacy answers across app, backend and dependencies. `NSPrivacyCollectedDataTypes=[]` is a manifest value, not certification that no operator/provider collection exists. Keep local-download clearing distinct from OS backups or external recipient copies. Complete age/content/accessibility disclosures and licensed store screenshots without implying NASA/ESA/ESO endorsement.

References to recheck at submission: [Apple app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/), [Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878), [Apple upcoming requirements](https://developer.apple.com/news/upcoming-requirements/). No store-compliance approval is claimed.
