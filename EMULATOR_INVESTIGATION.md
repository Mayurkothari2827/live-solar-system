# Android instability and partial-data investigation

Reviewed 12 October 2026. No device settings, host protections or development tools were changed in this follow-up. No emulator was restarted, no physical device was attached, and no physical-device performance was measured.

## Observed environment failures

Prior logs `/tmp/orbit-emulator-run.log` and `/tmp/orbit-emulator-retry.log` and `release-artifacts/qa/android-portrait.png` show a **Process system isn't responding** dialog, a QEMU2 main-loop hang (~21 seconds), guest API>35 ANGLE warnings, input stalls and Android `meminfo` service timeouts. Both logs identify a SwiftShader graphics adapter; the explicit retry flag did not establish a new hardware renderer. Retry at 1,536 MiB booted in ~21.6 seconds and opened ORBIT but did not eliminate service stalls. These are host/guest-system failures; they do not establish an ORBIT-specific ANR. Memory pressure and file-provider contention were also observed on the host. Correlation is not proof of a single cause.

A blank `adb devices` listing now confirms no available Android device. No reliable FPS/GPU/memory measurement can be derived from the failed service dumps or these heavily constrained runs. Preserve the logs; on a future isolated session run one emulator at a time, establish idle-system responsiveness first, then compare an ORBIT session using logcat/Perfetto and app-specific ANR stacks. These are diagnostic steps, not a claimed fix. Do not disable security protections or alter global host settings.

## Separate confirmed application defect

`fetchIndividualBodies()` stopped after three consecutive failures, then started every later retry at the same sorted missing IDs. A deterministic fixture with Jupiter and two of its moons failing prevented healthy Mars from ever being requested. Regression test failed before the patch, passed after it.

Targeted change: failed body IDs receive a 60-second cooldown; unattempted/healthy candidates rank before previously failed bodies, and old failures rank before recent failures. This keeps progress fair even when slow timeouts or delayed frame polling outlast the cooldown. Successful records clear the cooldown; the online event clears all cooldowns and retries immediately. The three-failure bound remains. It does not invent responses, modify state/orientation samples, expand cached validity, or conceal unavailable bodies. It does not claim to repair the emulator.

The recorded probe passed for all 30 bodies, including normalization and time coverage for 29 supplied rotation datasets. It left the unsupplied rotation unavailable. The live API probe validates all catalog body identities, finite seven-column states, increasing times, full coverage/current UTC and available quaternion normalization/coverage. Results are in `qa/live-api-results.json`, with their timestamp. A successful probe is a point-in-time service check, not a guarantee of uptime or an independent precision-astrometry comparison. Remaining unavailable data must remain visible and retried.

## Artifact scope

Only source and regression tests changed in this follow-up. Existing APK/simulator archives predate the retry fix. No native rebuild or signing was performed; the next explicitly authorized candidate build must include this patch and repeat the device checklist. The earlier compiled artifacts remain useful baseline evidence, not the final public release candidate.
