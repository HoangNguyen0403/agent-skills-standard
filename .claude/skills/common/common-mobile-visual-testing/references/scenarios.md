# Mobile Testing Scenarios (1–20)

Detailed procedures and verification criteria for cross-platform mobile testing. See [mobile-testing-matrix.md](mobile-testing-matrix.md) for full coverage matrix and stack mappings, §0 for expected-outcome sourcing and §12 for the failure-safe cleanup contract every mutating scenario inherits.

## 1. Visual Verification (every UI change) [AC-21]

- Wait for animations and skeleton loaders to settle before capturing.
- Capture **before state** (screenshot + hierarchy), perform user interaction, capture **after state**.
- Check against defect taxonomy: truncation, clipping, overlapping text, incorrect z-order, contrast.
- Use real/long-form internationalized data — placeholders hide truncation bugs.
- Mask dynamic content (timestamps, live tickers, random transaction IDs) when performing automated diffing.

## 2. Behavioral Flow & Navigation [AC-21]

- Walk through **complete user journey** across target screens.
- After each action, verify screen transition and focus shift; a tap with no observable response is a bug.
- Verify all lifecycle states: success, empty data, loading/skeleton, and error with actionable recovery.
- Verify backstack integrity: hardware back button (Android) and back gesture/bar (iOS) return to expected previous screen without duplicate instances.

## 3. Dark Mode

- Screenshot light mode → switch system/app theme to dark mode → screenshot → compare.
- Check: dark-on-dark unreadable text, missing themed background assets, hardcoded `#FFFFFF` / `#000000` colors, invisible separator lines.

## 4. Scroll, Lists & Virtualization [AC-21, AC-28]

- Screenshot initial list → scroll down smoothly (trigger pagination / infinite load) → scroll rapidly (fling) → scroll back to top.
- Check: zero duplicate items, zero dropped cells, smooth scrolling without dropped frames, pull-to-refresh resets state cleanly.

## 5. Multi-Device & Form Factor Matrix [AC-23]

- Test across justified matrix: smallest phone (iPhone SE / 4.7"), standard phone (6.1"-6.7"), and tablet / foldable if supported.
- Check: adaptive grid layouts, no horizontal overflow on small displays, tablet split-views function properly.
- Record device tier and environment: simulator/emulator vs physical device. Simulators do not prove hardware performance.

## 6. Location-Based Scenarios

- Set mock GPS coordinates to target market/region → verify localized currency, localized content, and regional availability.
- Deny location permission → verify the approved denied-state behavior (manual entry, reduced-radius fallback, or explicit unavailable copy — whatever the requirement specifies). Restore the original permission and coordinates in teardown.

## 7. Lifecycle, Process Replacement & Recovery [AC-22]

Assert the **approved** restoration outcome in every state below; draft retention, session validity and re-authentication are product decisions.

- **Warm Resume**:
  - Enter partial form data → background app (`appium_app_lifecycle: background` or home press) → wait 5s → resume.
  - Verify the approved outcome (draft retained or intentionally cleared, session validity, no duplicate network calls fired).
- **Retained State Across Recreation (Same Process)**:
  - Trigger activity recreation (`scenario.recreate()` or device orientation change).
  - Verify: the retained ViewModel/screen state still renders the draft. This proves **configuration-change retention only** — it passes even with no serialization, so do not call it saved-state or process-death proof. Close the scenario (`.use { }` / `close()`).
- **Saved-State Serialization (reconstruction, no device)**:
  - In a host test, capture what the ViewModel wrote into its `SavedStateHandle`/bundle, then construct a **fresh** owner from that captured bundle and assert the restored draft. Detects a missing write or a missing restore path. Still not process replacement.
- **Process Replacement & Cold Relaunch**:
  - Enter partial form data → background app → replace the process via external OS command. Record which transition you executed:
    - OS reclaim + saved-task restoration: background until the system reclaims, then restore the task from recents.
    - Force-stop / terminate + cold launcher launch (`adb shell am force-stop <package_id>` or `am kill`, Appium `appium_app_lifecycle: terminate` then `activate`).
  - Verify a new process actually ran (new PID / `Application` init) and the approved restoration outcome holds. Without external process control this is `BLOCKED (device: process control unavailable)`.
- **External Interruption**:
  - Trigger incoming phone call or system alarm dialog while media plays or transaction executes.
  - Verify: media pauses, resumes cleanly after interruption is dismissed.

## 8. Video Recording & Session Capture

- Record screen video during end-to-end user flows and attach to test evidence for complex or asynchronous regressions.
- Capture network and console logs alongside video for failure triage.

## 9. Native Accessibility Audit [AC-27]

- **Component Semantics vs. Live Screen Reader Execution**:
  - Asserting accessibility attributes (`contentDescription`, `accessibilityLabel`, `Semantics`) in component tests verifies framework tree nodes only.
  - Component tests **DO NOT** prove actual screen reader audio announcements, focus traversal, or gesture navigation on a physical device. Live assistive verification requires physical device execution or human audits.
- **Screen Reader Semantics**:
  - Verify all interactive controls have descriptive, non-redundant accessibility labels (VoiceOver / TalkBack).
  - Verify touch targets meet minimum 44×44 pt (iOS) / 48×48 dp (Android) requirements.
  - Verify logical accessibility focus traversal order (top-to-bottom, leading-to-trailing).
- **Screenshots alone do not prove accessibility**: Native element hierarchy and accessibility attributes must be validated.
## 10. Orientation (Portrait & Landscape) [AC-27]

- Screenshot portrait → rotate device to landscape → screenshot → rotate back.
- Check: zero content clipping, scrolling enabled if height restricted, modal dialogs adapt without pushing buttons off-screen.
- Restore orientation in teardown (a failed assertion must not leave the device landscape-locked).

## 11. Dynamic Type & Font Scaling [AC-27]

- Set system font size to **largest accessibility size** (iOS Accessibility XXL / Android 200%).
- Check: text wraps into multi-line instead of clipping with ellipsis; buttons remain tappable; no layout overlapping.
- Record the original font scale and restore it in teardown regardless of assertion outcome.

## 12. Localization & RTL Layout [AC-27]

- Switch to **long-string language** (e.g. German, Vietnamese) — verify zero text clipping or overlapping controls.
- Switch to **RTL language** (e.g. Arabic, Hebrew) — verify layout mirrors properly (back buttons point right, icons flip appropriately, numbers format per locale).
- Restore locale and region in teardown.

## 13. State-Specific Visual Proofs

Capture each screen state as a **separate visual proof**:
- **Empty state**: illustration, descriptive empty text, actionable primary CTA visible.
- **Loading state**: skeleton / spinner renders properly without flickering.
- **Error state**: user-friendly error message visible, retry CTA actionable.
- **Success state**: confirmation confirmation banner/screen renders with correct transactional data.

## 14. High Contrast & Display Modes [AC-27]

- Enable **Increase Contrast** system setting — verify borders, focus rings, and divider lines become distinct.
- Test combined mode: maximum accessibility font scale + high contrast together.
- Restore the original contrast setting in teardown.

## 15. Permissions & Platform Integrations [AC-24]

- **Dual-Path Permission Testing** — outcomes come from the approved requirement; each path declares its own precondition:
  - **Allowed**: precondition = permission not yet granted (fresh install or reset). Priming dialog appears *if the product defines one* → trigger the feature → **assert the OS prompt is present and its text** (bounded wait) → grant → assert the approved granted outcome (approved hardware/feature state or the approved enabled UI). A tap-only flow with no assertion of the prompt or the outcome is not a permission test.
  - **Denied**: separate run from the not-granted precondition (do not chain off the allowed test). Trigger the feature → assert the OS prompt → deny → assert the approved denied-state outcome (the specific fallback/disabled/rationale UI the requirement names).
  - **Revocation**: precondition = permission granted. Background app → revoke via OS settings → foreground app → app handles the missing permission per the approved behavior without crashing.
  - Cleanup: restore the original grant state for the app under test and remove any interruption handler you registered (`removeUIInterruptionMonitor`).
  - If the automation layer can only tap the dialog without asserting it, record the case as `partial`, not complete.
- **Deep Links & Universal Links**:
  - Test cold start via deep link: `appium_app_lifecycle(action: "deep_link", url: "...")`. Verify direct navigation to the approved destination screen.
  - Test warm start via deep link with app already in background: verify screen brought to front without backstack corruption.

## 16. Clean Installation vs Upgrade Migration [AC-26]

- **Clean Installation (`fullReset: true`)**:
  - Uninstall previous app version → install fresh build.
  - Verify the **approved** first-run state: initial route/screen, permission state, empty/populated datastore, any onboarding the product defines. Do not assume onboarding, ungranted permissions or an empty DB unless the requirement says so.
  - `fullReset` is not a secure-storage wipe: iOS Keychain can survive uninstall. If "no prior credentials" is the precondition, establish it explicitly (fresh synthetic identity per run, or the product's documented synthetic-credential reset).
- **Upgrade Migration Precondition**:
  - Setting `noReset: true` alone is **NOT** upgrade evidence, and it installs nothing — with `noReset` and an already-installed package the driver skips the `app` capability entirely. The real sequence is:
    1. Install the supported prior release build (record its artifact digest).
    2. Launch and seed a synthetic user session, persisted DB records (Room/SQLite/CoreData) and the secure-storage entries the scenario needs.
    3. Install the candidate **in place, outside the session**: `adb install -r <candidate.apk>` / iOS install of the new bundle over the old one. Signing identity and entitlements must match, otherwise the platform refuses the upgrade — treat that as `BLOCKED (artifact: signing incompatibility)`, never as a reason to flip reset flags.
    4. **Verify the installed build before attaching the session**: `adb shell dumpsys package <pkg> | grep -E 'versionName|versionCode|lastUpdateTime'` (iOS: `xcrun simctl listapps` / device build metadata) must show the candidate.
    5. **Attach the session to that candidate**: a `noReset` session installs nothing, so pass `appium:appPackage` + `appium:appActivity` (or the installed bundle id on iOS) and `appium:udid` — otherwise the driver attaches to no app or the launcher instead of the artifact you installed.
    6. Verify the approved migration outcome: schema migration runs, required data survives, required invalidation (e.g. session re-auth) happens, zero crashes.
  - Platform Keychain Caveats: iOS Keychain items generally persist across app upgrades and uninstalls; Android Keystore keys are preserved across in-place upgrades (`adb install -r`) but destroyed on uninstall (watch out for `allowBackup="true"` restoring encrypted data without keys).
  - If an older build cannot be provisioned or the installed build cannot be verified, the upgrade migration test is **BLOCKED**, never marked PASS.
- **Strict Rule**: Never retry a failed clean-install or upgrade test with inverted reset flags to obtain a false PASS.
## 17. Offline Support & Synchronization [AC-25]

- **Network Loss**:
  - Snapshot the original network state, then disable connectivity while the user performs the mutations the requirement permits offline (e.g. creating a note, queuing a transaction). If the product rejects offline writes, assert that blocking behavior instead.
  - Verify the approved offline indicator and the approved local persistence/discard behavior across app restart while still offline.
- **Reconnection & Idempotent Sync**:
  - Re-enable the network in `finally` so a failed offline assertion cannot leave the device offline.
  - Verify the approved sync model (automatic background sync or user-triggered) and that a retried flush does **not** create duplicate server records — assert on server/test-double state, not on the presence of a setter call.
  - Apply the specified conflict resolution policy (Client-Wins, Server-Wins, Last-Write-Wins); do not invent conflict behavior.

## 18. Security Boundaries & Release Artifact Smoke [AC-29, AC-30]

- **Secure Storage Audit**:
  - Verify sensitive credentials (auth tokens, refresh tokens, PINs) are stored exclusively in Keychain / Keystore / EncryptedSharedPreferences.
  - Verify plain SharedPreferences, UserDefaults, and public storage contain zero plaintext credentials.
- **Logout & Teardown**:
  - Drive the real logout entry point (UI action or approved API), not the storage clear directly.
  - Verify local state: tokens removed from secure storage, cached user data gone, back navigation cannot reach authenticated screens.
  - Verify the approved session boundary: the old refresh/session token is rejected by the identity boundary on reuse (synthetic identity only, isolated target).
  - Purge only test-owned secure entries in teardown; never wipe the user's real keychain/keystore.
- **Sensitive Log Audit**:
  - Capture device system logs (`logcat` / `os_log`) during authentication and checkout flows.
  - Verify zero passwords, credit card numbers, or auth tokens are logged to console.
- **Release Smoke Ledger**:
  - Record exact build artifact SHA-256 digest, build variant, target device/OS, and driver rung.
  - If required devices, drivers, or signed builds are unavailable, report as `BLOCKED` or `NOT RUN` rather than substituting browser tests.

## 19. Push Notification Ingress [AC-24, AC-28]

Risk-selected: applicable whenever the product ships notifications. A registered push token is **not** evidence of receipt or routing.

- **Precondition**: physical device (or a push-capable emulator image), release/profile build for the push flavor, approved test sender (FCM/APNs sandbox, synthetic topic, never a production campaign), the notification/data permission state the case needs, and the original OS notification state recorded.
- **Delivery preconditions differ per state — record the exact one, do not generalize**:
  - **Foreground**: app open → send → assert the presentation the approved contract defines for foreground (which may be no system notification at all; Android does not post one for foreground messages unless the app does).
  - **Background**: app backgrounded → send → assert receipt/presentation per contract → tap → assert the approved destination and payload context, backstack not duplicated.
  - **Terminated — ordinary (not force-stopped)**: app ended by the user/task removal or reclaimed by the OS → send → assert receipt and tap routing as the contract specifies, and confirm whether a cold start occurred.
  - **Force-stopped (`adb shell am force-stop`, "Force stop", iOS force-quit)**: a **distinct suppression case**. On Android a force-stopped app does not receive FCM until it is reopened; on iOS force-quit delivery is also not guaranteed. Test this as `expected suppression until relaunch`, then reopen and assert normal receipt resumes — never as a required shade receipt.
- **Presentation comes from the approved contract**: notification payload → visible notification whose fields the requirement names; **data-only** payload → the processing the app defines (it may post nothing). Do not require a shade notification or tap for a data-only message.
- **Denied/unavailable display permission**: assert the contract's defined behavior for that transport and permission state (in-app inbox, deferred display, or no UI). "Shows a fallback banner" is only correct when the requirement says so; never auto-grant.
- **Payload variants**: at least one deep-link payload and one data-only payload, both synthetic, each with its own expected outcome.
- **Evidence limits**: simulator push support may be unavailable → `BLOCKED (device: push unavailable)`. Local-notification scheduling does not prove remote receipt.
- **Cleanup**: dismiss delivered notifications, clear the test topic/subscription and synthetic device token in teardown.

## 20. Battery & Energy (physical device) [AC-28]

Risk-selected: applicable only when the product has an approved battery/energy objective (background sync, location tracking, media, long sessions).

- **Precondition**: physical device, release build, documented starting charge, fixed screen brightness, airplane/Wi-Fi state as the scenario requires, other apps closed, thermal state recorded.
- **Bounded action**: run the approved scenario for a fixed duration (e.g. 30 min) with the approved background behavior enabled; stop on a documented condition.
- **Measure**: OS-reported energy data (`adb shell dumpsys batterystats`, iOS Settings > Battery or Instruments Energy Log) and the approved metric (mAh, %/hour, energy impact).
- **Assert** the approved objective. Missing objective → `BLOCKED (requirement: battery objective undefined)`; no physical device → `BLOCKED (device: physical battery measurement)`; simulator readings → `NOT RUN` for this objective.
- **Cleanup**: restore original network/brightness/background settings and stop any test-only background job.

---

## §overlay — Marketing/Analytics Overlay Interference

SDKs (CleverTap, Braze, Firebase) render in-app messages that:
- Intercept taps meant for app UI.
- Re-fire on screen transitions.

**Strategies:**
1. **Pause campaigns** for test devices in the SDK dashboard.
2. **Defensive dismiss**: If an unexpected marketing/promo popup appears, find close button near top-right and tap to dismiss.
3. **CRITICAL WARNING**: NEVER defensively dismiss system permission dialogs or alerts that are part of the scenario under test!

## §overflow — Default-Viewport Widget Tests Hide Overflow

Flutter's default test viewport is 800×600 — wider than any phone.

**Add for any layout that may overflow:**
```dart
Intl.defaultLocale = 'vi'; // longest target locale
expect(tester.takeException(), isNull);
```

**Simulate smallest target device:**
```dart
tester.view.physicalSize = Size(width * dpr, height * dpr);
```
