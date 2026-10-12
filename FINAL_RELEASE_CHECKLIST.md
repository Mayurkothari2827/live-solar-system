# Final public-launch gates — 12 October 2026

**Current decision: do not publicly launch yet.** No signing, deployment or submission was performed. Existing builds prove the earlier native baseline compiles; this follow-up fixes retry starvation in source and adds acceptance evidence, without rebuilding the native projects.

Status definitions: **VERIFIED** means the stated scope has actual evidence. **FAILED** means a launch gate is not met (missing clearance/configuration/candidate evidence), not necessarily a runtime code failure. **REQUIRES PHYSICAL DEVICE** means an installed-phone result is absent, even if logic tests pass. Never promote simulator/mock results into physical-device results.

| Gate | Status | Evidence / next action |
|---|---|---|
| Existing native baseline compilation | VERIFIED | Prior debug APK and ARM64 simulator build succeeded; see RELEASE_VERIFICATION.md. Not a production-signing or post-patch build receipt |
| Automated source functionality | VERIFIED | 72 JavaScript tests and 5 Python tests pass; see qa/javascript-tests.log and qa/python-tests.log. Scientific/navigation/time/tours/comparison/saved-state/cache logic plus new cases. Mock renderer/plugins, not GPU/OS share-sheet evidence |
| Partial-data starvation | VERIFIED | Regression failed before patch, passes after: 60-second cooldown, fair failed-body ordering and immediate online retry; no astronomical data substitution |
| All current catalog API records | VERIFIED | qa/live-api-results.json: 30 current valid state records, 29 available quaternion datasets pass norm/time coverage; one has no supplied rotations |
| Expired/wrong-body/malformed offline rejection | VERIFIED | Native/PWA tests and current-UTC renderer expiry tests; cached records retain original dates |
| Native share storage/cancel wiring | VERIFIED | Cache/orbit-share file URI, cancellation propagation and UI cancellation tests; not an OS-target read receipt |
| Direct SDK license notice preparation | VERIFIED | Full pinned Capacitor MIT texts retained; static output includes notice index. Final native package/transitive notices still require inspection |
| Camera and lifecycle wiring | VERIFIED | Pointer drag/pinch/cancel and native app-state/visibility/online tests; no physical input measurement |
| Context recovery state | VERIFIED | Both observatories preserve model/selection on synthetic lost/restored events; no real GPU reset claim |
| Earlier iPhone layout fixes | VERIFIED | Prior final installed simulator portrait/landscape screenshots; resolved header/Fit overlap |
| Emulator-based complete interactive QA | FAILED | System ANR/QEMU hang/input and meminfo stalls; no proven app-specific root cause; see EMULATOR_INVESTIGATION.md |
| New native candidate contains latest source fix | FAILED | Existing APK/simulator archives predate this follow-up; future authorized build and integrity checks required |
| Complete native gesture/share/lifecycle acceptance | REQUIRES PHYSICAL DEVICE | D01–D11/D16/D19 in DEVICE_TESTING_CHECKLIST.md; no connected Android/iPhone available |
| Offline cold launch/expiry/clear/reconnect acceptance | REQUIRES PHYSICAL DEVICE | D12–D15; no successful offline-installed-phone receipt |
| GPU recovery, memory growth, thermals/battery/frame pacing | REQUIRES PHYSICAL DEVICE | D17–D18; record device/build and real traces, not emulator FPS claims |
| Backup/update/restore and signed entitlements | REQUIRES PHYSICAL DEVICE | Device checklist platform-specific cases; preserve discoveries on updates |
| Exact permission / distribution identity ownership | FAILED | Source values verified: com.orbit.observatory, 2.0.0(1). Publisher must confirm store availability/history and inspect final signed candidate |
| Android release signing / iOS distribution profile | FAILED | No publisher key/team/profile configured; commands/instructions prepared, not executed |
| 12 unresolved map-source grants / 24 native derivatives | FAILED | Exact paths in ASSET_LICENSE_AUDIT.md and qa/asset-license-inventory.csv; obtain per-file evidence |
| 5 ShareAlike sources / 10 native derivatives | FAILED | Sidecars found, but publisher asset redistribution/store-terms sign-off absent |
| Artwork ownership, remote image exceptions, dataset terms | FAILED | Every known imagery file/native PNG and all 9 external observations enumerated; publisher clearance needed |
| Screenshot export and marketing attribution | FAILED | PNG export excludes DOM credits; publisher must resolve attribution that travels with exported renders |
| Final privacy URL/contact/Data Safety/App Privacy | FAILED | Operator/provider logging/retention and platform backups require review; manifests do not replace disclosures |
| Matching web scene-link behavior | FAILED | New native scene URLs rely on public web behavior; this local candidate has not been deployed; validate later under separate authorization |
| Store screenshots, descriptions, version/build history, submission-date rules | FAILED | Publisher preparation and review remain; no listing/account/store validation performed |

## Sign-off order

1. Obtain per-file license evidence and publisher decisions for export attribution, artwork, SDK/data notices and privacy/backup practices.
2. Complete source tests and a separately authorized new candidate build. Record hash, revision/patch and full package/manifest checks; do not use the earlier binary as proof of the patched source.
3. Run the Android/iPhone device checklist, fix only reproduced issues, repeat affected tests and document every unperformed case.
4. Publisher configures keys/team/profiles and reviews signing/entitlements and store requirements. This task authorizes no signing or submission.
5. Decide launch only after every FAILED gate is closed and every required phone case has evidence. Any future deploy/upload requires separate authorization.

See PRODUCTION_RELEASE_GUIDE.md for commands and credential-safe signing instructions, ASSET_LICENSE_AUDIT.md for file-level decisions, and EMULATOR_INVESTIGATION.md for the distinct environment and application findings. No public-launch approval is implied by passing automated tests.
