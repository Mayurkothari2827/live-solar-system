# ORBIT device acceptance checklist — 12 October 2026

No physical-device result is recorded yet. Android adb currently lists no attached device; Apple devicectl lists no physical iPhone. Prior emulator/simulator screenshots are useful visual evidence, not device sign-off. Follow the same steps on Android and iPhone; leave each checkbox empty until evidence is captured.

## Test record and setup

Record tester, date/UTC, device model, OS version, Android WebView version, app version/build, source revision or patch fingerprint, candidate SHA-256, install channel, orientation, graphics setting and network. Record PASS/FAIL plus screenshot/log for each test ID. Do not send a share to another person during QA; use cancellation or a local save target.

Use at least a modest Android phone and a recent Android phone, plus a small iPhone and a recent iPhone with a notch/Dynamic Island. Cover the minimum supported OS where hardware/tooling permits and a current OS. Android supports API 24+, target 36; iPhone app minimum is 15.4. Test gesture navigation and three-button Android navigation. Suggested layout cases: 360×800, 390×844, 412×915 and landscape; these are layout targets, not measured physical devices.

Install a newly built candidate containing the retry fix. Existing debug binaries predate that fix. Preserve discoveries when updating: do not automatically uninstall on a signing-key mismatch. Confirm UTC/automatic date settings; do not change a personal phone clock to simulate stale astronomy.

## Both platforms

| ID | Check | Expected result | Android | iPhone |
|---|---|---|---|---|
| D01 | Cold launch, repeat launch, portrait/landscape | Correct icon/splash; bounded loading; readable controls; no overlap, clipping or unsafe-area obstruction | [ ] | [ ] |
| D02 | Open/scroll/dismiss Explore, App, Telemetry, Moons, Time and Data | Sticky close controls, keyboard dismissal, focus restoration; 44px targets; content reachable; no page scrolling behind modal | [ ] | [ ] |
| D03 | Earth, every planet and available moon; all-planets scale modes | Selected target/frame/units correct; texture and physical-vs-enlarged scale disclosed; unavailable bodies not invented | [ ] | [ ] |
| D04 | One-finger orbit, two-finger pinch, cancel gesture, fast repeated target switches | Camera responds without accidental selection, stuck pointer, page zoom or scroll conflict | [ ] | [ ] |
| D05 | Pause, speed, scrub, Now, leave/return from background | Live mode returns to current UTC; playback does not accumulate hidden elapsed time; stopped rendering resumes | [ ] | [ ] |
| D06 | Explorer/Science, body directory/search and immersive view | Shared selected object, correct provenance/window/vectors; settings survive restart; immersive exit accessible | [ ] | [ ] |
| D07 | All seven guided tours: previous/next/pause/exit, cross-page step, resume | Correct target and instructions; manual progression; no jump while paused; saved tour resumes | [ ] | [ ] |
| D08 | Compare planets and moons | Physical radius ratios; missing masses/gravity remain unavailable rather than calculated fiction | [ ] | [ ] |
| D09 | Save discovery/view; terminate/relaunch; restore; expired saved UTC | Local state survives normal restart; camera/UTC restored; out-of-window view rejected clearly | [ ] | [ ] |
| D10 | Share link, cancel share, share again, local-save PNG | Native sheet opens once, cancellation benign; temporary file readable; recipient can open scene link after matching web version is available | [ ] | [ ] |
| D11 | Deep space: Milky Way, all nine catalog objects, nearby hosts/planets, recorded image failure | Catalog snapshot/reconstruction labels remain visible; missing images offer source link; no present-day exoplanet phase claim | [ ] | [ ] |
| D12 | Warm valid data, airplane mode, terminate/relaunch | Bundled shell/catalogs/textures work; valid downloads show cached-source notice; external telescope images may fail visibly | [ ] | [ ] |
| D13 | Offline with empty/expired ephemeris store; switch selected body | Unavailable state, no stale position or false current-source claim; source window preserved | [ ] | [ ] |
| D14 | Restore connection after failed/partial loading | Immediate reconnect retry; available bodies load beyond failed ones; no repeated first-three starvation | [ ] | [ ] |
| D15 | Clear downloads while requests are pending, then offline restart | Cleared ephemerides do not reappear from old requests; native bundled assets remain; preferences/discoveries retained | [ ] | [ ] |
| D16 | Background, lock/unlock, interruption, memory pressure; repeat 20 times | State and controls recover; no black canvas, duplicate loops or accelerated playback | [ ] | [ ] |
| D17 | WebGL context loss/restoration in a disposable test session | Loading/loss state then visible scene; same selection/camera; GPU textures recover; context failure never hides data unavailability | [ ] | [ ] |
| D18 | Low/Balanced/High, 15-minute orbit/navigation session, repeat switches | Record actual frame pacing, memory, battery/temperature and OS warnings; no progressive resource growth | [ ] | [ ] |
| D19 | Credits, source links, privacy information, permissions | Complete notices reachable; no unexpected sensor/storage prompts; external links open safely | [ ] | [ ] |

For D13, remain offline through the genuine source-window end or use an isolated debug profile with an explicitly expired test cache. Do not spoof production NASA/JPL data or report a test fixture as real astronomy. For D17, use a debug-only WebGL context-loss test hook/devtools when available; no production control was added. If unsupported, record NOT PERFORMED and retain the physical-device gate.

## Platform-specific checks

- [ ] Android Back closes App/Explore/info/observation overlays before navigation; deep-space Back returns to solar; root behavior is understood and does not trap the user.
- [ ] Android FileProvider shares only `cache/orbit-share/`; saved PNG opens in the local chosen target; revoked grants do not leave broad filesystem access.
- [ ] Android update with the same signing identity preserves preferences/discoveries; backup/restore behavior is assessed because `allowBackup=true`.
- [ ] iPhone swipe/Home/background interruptions and iOS share popover work in both orientations; safe-area sheets avoid the home indicator.
- [ ] iPhone restoration after OS termination is tested independently from ordinary background resume; backup behavior matches the privacy statement.
- [ ] Both candidates use the intended production identity/version, correct signed entitlements and no debug-only inspection settings in the eventual release artifact.

## Acceptance record

Every failure needs device/OS, build hash, steps, expected/observed behavior and screenshot/log. Record elapsed loading and failed body IDs separately from drawing performance. Do not attribute emulator system ANRs to ORBIT without an app-specific stack/trace. No public-launch sign-off until unresolved failures and the release/license/privacy gates are closed. Use QA accounts and local sharing targets; never publish/store-submit during this checklist.
