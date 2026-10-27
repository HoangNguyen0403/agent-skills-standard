# Mobile Testing Coverage Matrix & Platform Methodology

Comprehensive cross-platform mobile testing methodology covering the 10 critical mobile areas across Native iOS, Native Android, Flutter, and React Native.

## 0. Expected-Outcome Sourcing (read first)

Every scenario below asserts an **approved** expected outcome, never a generic one:

- **Cite the source** for each assertion: requirement/AC id, design doc, or product policy. Restoration behavior, permission UX after denial, optimistic UI, background synchronization, session migration on upgrade and performance objectives are all product decisions, not mobile defaults.
- **Example values are synthetic fixture-only.** Any number or UI text shown here (startup thresholds, badges, banners, retry counts) is an illustration for a fictitious app; it is not a mobile-platform requirement.
- **Missing criterion blocks the dependent assertion, not the plan.** Record the scenario as `BLOCKED (requirement: missing expected outcome)` and keep the rest of the matrix running. Do not substitute a plausible default.
- **Real apps may legitimately differ.** Discarding sensitive drafts, invalidating sessions on upgrade, requiring manual sync, or refusing offline writes are valid contracts; a procedure that assumes the opposite would fail a correct app.
- **Scenario record:** use the shared C6 ledger in [test-plan-template](../../../quality-engineering/quality-engineering-test-plan-authoring/references/test-plan-template.md#mobile-scenarios-contract-c6); do not invent a parallel mobile ledger.

## 1. Source-Backed Coverage Matrix (10 Areas × 4 Stacks)

| Mobile Scope Area | Native iOS (Swift/XCTest) | Native Android (Kotlin/Compose) | Flutter (Patrol/Integration) | React Native (Jest/Detox/Appium) | Canonical Source & Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Functional / UI** (AC-21) | `XCUITest`, `XCUIApplication`, `.tap()`, `.typeText()` | `createAndroidComposeRule`, `onNodeWithTag`, `performClick` | Robot pattern, `patrolTest`, `$.tester.tap()` | RNTL `render`, `fireEvent`, Detox/Appium device taps | `quality-engineering-selector-stability`, `common-mobile-visual-testing` |
| **2. Lifecycle & State** (AC-22) | `XCUIDevice.press(.home)`, `activate()`; terminate & cold launch | Activity recreation (`recreate()` same process); external `am kill` & cold launch (process death) | `WidgetsBindingObserver`, `$.native.pressHome()`, `openApp()` | `AppState.addEventListener`, native process kill & restore | `common-mobile-visual-testing/references/scenarios.md#7` |
| **3. Device / OS Matrix** (AC-23) | Smallest/largest iPhone, iPad, min supported iOS version | Min SDK (API 26+), tablet/foldable, OEM skin quirks | Multi-screen size, tablet layout, responsive breakpoints | Screen dimension variations, platform density scaling | `common-mobile-visual-testing/references/scenarios.md#5` |
| **4. Platform & Permissions** (AC-24) | `addUIInterruptionMonitor`, `XCUIProtectedResource`, deep link URL | `ActivityResultLauncher`, `POST_NOTIFICATIONS` priming | `$.native.grantPermissionWhenInUse()`, `nativeAutomation` | Detox `launchApp({ permissions })`, Appium alert handler | `android-notifications/SKILL.md`, `appium-mcp/references/tool-cheatsheet.md`, `scenarios.md#15,19` |
| **5. Offline & Sync** (AC-25) | Airplane mode simulation, offline cache queue, idempotency token | Network callback fakes, Room offline queue, WorkManager sync | Connectivity fake, offline BLoC event, retry sync | NetInfo mocking, offline mutation queue, retry backoff | `common-mobile-visual-testing/references/scenarios.md#7` |
| **6. Install & Upgrade** (AC-26) | `fullReset` (clean) vs `noReset` (upgrade), CoreData/Keychain migration | Fresh install vs `adb install -r`, Room/Preferences migration | Clean install vs upgraded APK/AAB, SQLite/Hive migration | Fresh bundle vs OTA update/bundle migration, storage persistence | `quality-engineering-appium-mcp/references/driver-ladder.md` |
| **7. A11y & Presentation** (AC-27) | VoiceOver (`accessibilityLabel`), Dynamic Type (XXXLarge), Safe Area | TalkBack (`contentDescription`), Font scale, `WindowInsets` | `Semantics` widget, textScaleFactor, notch/safe-area wrap | `accessible`, `accessibilityLabel`, `accessibilityRole`, safe-area | `common-mobile-visual-testing/references/scenarios.md#9,11` |
| **8. Performance & QoS** (AC-28) | `XCTApplicationLaunchMetric`, `XCTOSSignpostMetric`, frame drops | Macrobenchmark startup/jank, Profiler CPU/Mem, ANR watchdog | DevTools timeline, frame rasterization budget, memory profiling | Flashlight / Flipper profiling, JS thread FPS vs UI thread FPS | `quality-engineering-appium-mcp/SKILL.md:64`, `scenarios.md#4,20` |
| **9. Security & Privacy** (AC-29) | Keychain Services, bio auth fallback, `os_log` PII redaction | `EncryptedSharedPreferences`, Android Keystore, logcat redaction | `flutter_secure_storage`, mock/fake in unit, real in E2E | `react-native-keychain`, secure storage boundary, no token logs | `android-security/SKILL.md`, `flutter-security/SKILL.md` |
| **10. Release Smoke** (AC-30) | `.ipa` / `.app` artifact digest, Ad-Hoc/TestFlight context, device/OS | `.apk` / `.aab` digest, Internal App Sharing, device/OS | Release build artifact digest, target device/OS, driver rung | Release APK/IPA digest, distribution channel, device/OS | `quality-engineering-appium-mcp/references/driver-ladder.md` |

---

## 2. Test Layer Selection & Fidelity (AC-21)

Every mobile test must be authored at the appropriate fidelity level:

1. **Unit Tests (Logic / ViewModels / Repositories)**:
   - Swift: `XCTestCase`, `async throws`, constructor-injected protocols.
   - Android: `runTest`, `Turbine`, MockK / fakes, `MainDispatcherRule`.
   - Flutter: `test()`, `blocTest()`, isolated builders.
   - React Native: `jest`, unit tests for business hooks/utilities.
   - *Fidelity*: Fast logic verification. Zero native OS/UI fidelity.

2. **Component / Widget Tests (In-Memory UI)**:
   - Swift: SwiftUI View previews / snapshot tests.
   - Android: `createAndroidComposeRule` with mocked repositories.
   - Flutter: `testWidgets()` with `pumpWidget()` and `BaseRobot`.
   - React Native: `@testing-library/react-native` (`render`, `fireEvent`).
   - *Fidelity*: Validates UI rendering, state binding, and localized string wrap. **CANNOT** count as native device verification.

3. **Subsystem Integration Tests (In-App Navigation & Real Storage)**:
   - Swift: Integrated module tests with local SQLite/CoreData.
   - Android: Instrumented Hilt tests (`@HiltAndroidTest`) with in-memory Room.
   - Flutter: `integration_test` with real service containers and navigation.
   - React Native: Multi-screen navigation with MSW network boundary.
   - *Fidelity*: Verifies end-to-end data flow inside app boundaries.

4. **Native Device E2E & Automation (Black-Box on Device/Simulator)**:
   - Frameworks: `XCUITest`, `UiAutomator`, `Patrol` (`$.native.*`), `Appium MCP`, `Detox`, `Maestro`.
   - *Fidelity*: Exercises actual app binary, native alerts, platform permissions, deep links, and OS lifecycle.
   - *Rule*: Browser viewport emulation and component-only tests **MUST NEVER** be reported as native device verification.

---

## 3. Lifecycle, Interruptions & State Restoration (AC-22)

### Four Lifecycle States
1. **Warm Resume (Background -> Foreground)**:
   - App moves to background (`onPause` / `applicationDidEnterBackground`) and returns to foreground (`onResume` / `applicationWillEnterForeground`) without process destruction. Process heap and in-memory singletons remain untouched.
   - Assert the approved background/foreground outcome (draft retention, call de-duplication, timer pause). Retained drafts are a product decision, not a mobile default.
2. **Activity / View Recreation (Same-Process Configuration Change)**:
   - Activity or View is destroyed and recreated within the SAME running process (e.g. `ActivityScenario.recreate()`, screen rotation, font scale change).
   - What it proves: **retained state**. Activity-scoped ViewModels, singletons and the process heap survive configuration recreation, so this test can pass with no serialization implementation at all.
   - **Strict Limitation**: it proves neither `SavedStateHandle`/`onSaveInstanceState` serialization nor OS process death. Do not label its assertion "restored from saved state".
2. **Saved-State Serialization (Reconstruction, no device)**:
   - What it proves: the write path persists the draft into the saved-state handle/bundle and the read path restores it into a **fresh** owner (new ViewModel/controller constructed from the captured saved-state bundle).
   - Reusing the retained ViewModel instance for both halves is invalid; recreate the owner from the captured bundle and assert the approved restored value.
   - Still not process replacement: the OS never wiped the heap in this test.
3. **Process Replacement & Restoration (Relaunch)**:
   - The OS terminates the process (background reclaim) or the operator force-stops/terminates it. Process heap is wiped; `Application` re-initializes from scratch and state must come from disk/persisted saved state.
   - **Distinguish the transitions**: OS memory reclaim followed by saved-task restoration (system restores the task/saved instance state) is a different precondition from driver force-stop or explicit terminate followed by a cold launcher launch. Record which one was executed; do not treat them as interchangeable.
   - **Testing Requirement**: cannot be executed from inside the test process. Needs external device control (e.g. `adb shell am kill <package_id>` / `am force-stop` then cold launch, or Appium `appium_app_lifecycle` terminate + activate). Observe the restored UI and confirm the process actually changed (new PID / re-run `Application` init) in device evidence. Without external control: `BLOCKED (device: process control unavailable)`.
   - Assert the **approved** restoration outcome: an app may legitimately restart at onboarding, drop an unsaved draft, or require re-authentication.

### External Interruptions
Incoming phone call, system alarm, or control center overlay. UI must pause active media/timers and resume gracefully upon dismissal without resetting navigation.
---

## 4. Justified Device / OS Matrix & Tiering (AC-23)

Do not generalize an execution on one device/OS to all platforms. Use risk-weighted tiering:

| Tier | Category | Selection Criteria | Minimum Required Coverage |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Core)** | Primary Target Devices | Top 2 active user devices + latest OS the product supports (the iOS/Android version numbers below are examples only; derive them from the product support matrix and user telemetry) | Full E2E regression on local simulator/device or device cloud |
| **Tier 2 (Breadth)** | Form Factors & Min OS | Minimum supported OS (e.g. iOS 15, Android 8/API 26) + Tablet/Foldable + Smallest screen (iPhone SE / 4.7") | UI layout audit, dynamic type scaling, install verification |
| **Tier 3 (OEM Quirks)** | Heavily skinned Android | Samsung OneUI / Xiaomi MIUI / Transsion battery optimizers | Background sync, push notification receipt, permission flows |

- **Simulator vs. Physical Device Evidence**:
  - Simulators/Emulators are valid for functional flow, layout, and regression verification.
  - Simulators/Emulators **CANNOT** prove hardware performance, thermal throttling, real battery consumption, or biometric hardware integrity.
  - Record the exact target in evidence: `[Simulator: iPhone 15 iOS 17.5]` vs `[Physical: Samsung Galaxy S23 Android 14 (SM-S911B)]`.
  - If a required physical device or OS version is unavailable, report that matrix cell as `BLOCKED (device: unavailable)`, not PASS.

---

## 5. Platform Integrations & Permissions (AC-24)

### Rules for Testing Permissions
1. **Never Auto-Grant in Permission Tests**: Do NOT set `autoGrantPermissions: true` or automatically dismiss dialogs when testing the permission flow itself.
2. **Declare preconditions per path**: for each of allowed / denied / revoked, start from the declared OS permission state (not granted, granted, previously granted then revoked) and assert the OS prompt *before* answering it.
3. **Dual-Path Verification** (outcomes come from the approved requirement, not from this table):
   - **Allowed Path**: user grants permission -> assert the approved visible result of the granted feature (e.g. camera preview active, location resolved, push token registered) **or** the approved enabled-state UI. Names in this table are illustrative.
   - **Denied Path**: user denies permission -> assert the approved denied-state outcome: the specific fallback UI, disabled affordance or settings prompt the requirement names. A settings banner is only correct if the product specifies it; a silently disabled feature or a one-time rationale is equally valid.
   - **Revocation Path**: app backgrounded -> permission revoked in system settings -> app foregrounded -> assert the approved revoked-state behavior without crashing.
4. **Priming Dialogs**: only if the product defines a pre-permission explanation; verify it appears before the OS prompt when specified.
5. **Explicit design-before-tap**: assert dialog presence/text via a bounded wait; if only the tap helper is available and the dialog cannot be asserted, label the case `partial` rather than complete.

### Deep Links & Push Notification Ingress
- Deep link entry conditions:
  - **Cold Start via Deep Link**: App not in memory -> deep link launched -> app initializes root, authenticates session, and navigates directly to the approved destination.
  - **Warm Start via Deep Link**: App running in background -> deep link launched -> app brings target screen to top of stack without duplicating backstack.
- **Notification ingress is a separate risk-selected obligation** whenever the product ships notifications; a registered push token is not evidence of receipt or routing:
  - App state matrix: **foreground**, **background**, **terminated (ordinary)**, **force-stopped/force-quit** — one cell per state, each recorded separately. Force-stop (Android `am force-stop`, iOS force-quit) suppresses delivery until the app is reopened: test it as an expected suppression case, never as a required receipt.
  - Per cell assert only what the approved contract defines: receipt/presentation for a notification payload, app-defined processing for a **data-only** payload (possibly no visible notification), foreground presentation (often handled in-app, not by the system), tap routing target and payload context, and cold-start vs warm-resume semantics for taps from a non-running state.
  - Assert **denied/unavailable notification display** against the contract's defined behavior for that transport and permission state (in-app inbox, deferred display, or no UI — not an assumed banner). Never auto-grant.
  - Physical device or FCM/APNs synthetic sandbox sender required; a simulator without push support is `BLOCKED (device: push unavailable)`. Never infer receipt from local-notification scheduling.
  - Cleanup: dismiss delivered notifications and clear the test topic/subscription token so the next scenario does not inherit stale payloads.

---

## 6. Offline Support & Data Synchronization (AC-25)

### Verification Protocol
1. **Offline State Entry**: Disable network (airplane mode or proxy drop). Save the original network state first; restore it in `finally`/teardown even when an assertion fails (see §12).
2. **Local Mutation**: Perform the user actions the requirement allows offline. If the product forbids offline mutation for that operation, assert the approved blocking/queued messaging instead — do not require an offline write the app intentionally refuses.
3. **Local State & Persistence** — assert only what the requirement specifies:
   - Optimistic UI with a pending/queued indicator **when the product defines optimistic updates**; otherwise assert the defined provisional or blocking state.
   - Persistence across app restart while still offline **when the product persists the queue**; otherwise assert the approved discard/expiry behavior.
4. **Reconnection & Synchronization**:
   - Re-enable network, then assert the approved sync model: automatic background sync (WorkManager, BGAppRefresh, WebSocket reconnect) or explicit user-triggered sync. "Syncs automatically" is a product decision, not a mobile guarantee.
   - Verify idempotency where duplicates are forbidden: the server must receive a stable idempotency key and a retried flush must not create a duplicate record.
5. **Conflict Resolution**:
   - Adhere strictly to the product requirement conflict policy (Client-Wins, Server-Wins, Last-Write-Wins, manual merge).
   - Never invent conflict rules. If undefined in spec, flag the requirement as a blocker and mark dependent assertions `BLOCKED (requirement: conflict policy undefined)`.

---

## 7. Clean Installation, Upgrades & State Preservation (AC-26)

### Upgrade Preconditions vs. Reset Capability
Setting `noReset: true` alone is **NOT** upgrade evidence, and it does not install anything: when a session is created with `noReset: true` and the package is already present, the driver skips installation of the `app` capability. A changed `app` path therefore proves nothing unless the candidate was installed explicitly and the installed build was verified.

### True Upgrade Verification Protocol
1. **Install Prior Build**: Install a supported prior release build (e.g. `v1.9.0-prod`, artifact digest recorded).
2. **Seed State**: Launch prior build, authenticate with the synthetic identity, write database records (Room/SQLite/CoreData), and store tokens.
3. **In-Place Install Candidate (explicit, outside the session)**: install the target candidate over the prior build without wiping data — `adb install -r <candidate.apk>` on Android, device/simulator install of the new `.app`/`.ipa` on iOS. Both artifacts must share signing identity/entitlements or the platform rejects the in-place upgrade; a signature mismatch blocks the scenario (`BLOCKED (artifact: signing incompatibility)`), it is never "fixed" by reset flags.
4. **Verify the Installed Build**: before attaching the preserve-state session, confirm the device runs the candidate — `adb shell dumpsys package <pkg> | grep -E 'versionName|versionCode|lastUpdateTime'`, iOS `xcrun simctl listapps` / device build metadata. Record the observed version/build and compare with the candidate digest.
5. **Attach the session to the installed candidate**: a `noReset` session installs nothing, so name the AUT explicitly — `appium:appPackage` + `appium:appActivity` (Android) or the installed bundle id (iOS) — and pin `appium:udid` to the device you verified. Without AUT selection the driver attaches to no app (or the launcher), not to the artifact you just installed.
6. **Verify Migration**: Launch upgraded app; assert the **approved** migration outcome: schema migration executes, the data the requirement says must survive does survive, behavior the requirement says must change (e.g. session invalidation, forced re-auth, token rotation) does change, and there are zero crashes.
7. **Honest Reporting Gate**: If a prior build cannot be provisioned, installed in place, or the installed build cannot be verified, the upgrade migration test is `BLOCKED`, never marked PASS.

### Clean-Install State vs. Reset Flags
- `fullReset` covers app uninstall/reinstall; it is not a universal secure-storage wipe. iOS Keychain data can survive uninstall and reinstall.
- If a scenario's precondition is "first run, no prior credentials", establish that state explicitly (fresh synthetic identity per run, or the product's documented synthetic-credential reset), not by assuming uninstall cleared Keychain/backup-restored state. See §12 for the cleanup contract.

### Platform-Specific Secure Storage Migration Caveats
- **iOS Keychain Services**: Keychain items belong to security access groups and typically persist across app upgrades and re-installs unless explicitly configured with ephemeral accessibility flags.
- **Android Keystore & EncryptedSharedPreferences**: Keystore master keys are bound to the app's package UID and signing certificate. In-place upgrade preserves keys. However, uninstalling the app permanently destroys Keystore keys. Be vigilant of `android:allowBackup="true"`: restoring encrypted preferences without Keystore keys causes fatal decryption crashes unless backup rules exclude encrypted files.
---

## 8. Native Accessibility & Presentation Fidelity (AC-27)

### Component Semantic Tree vs. Live Screen Reader Execution
- **In-Memory Semantic Node Assertions**: Asserting `contentDescription` in Compose, `accessibilityLabel` in RNTL, or `Semantics` in Flutter checks the framework's accessibility tree.
- **Strict Limitation**: Component semantic tests **DO NOT** prove actual screen reader (TalkBack / VoiceOver) behavior. They do not verify audio announcements, accessibility gesture navigation, or real focus traversal order on a physical device. Live screen reader focus verification requires physical device execution or human-in-the-loop accessibility audits.
  - Test at maximum system accessibility font size (iOS Accessibility XXL / Android 200%).
  - Text must wrap or truncate gracefully with tooltip; must not clip, overlap, or push action buttons off-screen.
- **Safe Area & Hardware Cutouts**:
  - Verify layout on notched/Dynamic Island screens and devices with gesture bars (Android 3-button vs gesture navigation).
  - Verify content does not bleed under status bars or navigation bars.
- **Soft Keyboard Interaction**:
  - When input focuses, keyboard must not obscure the input field or primary action CTA.
  - Tap outside or scroll must dismiss soft keyboard cleanly.

---

## 9. Mobile Performance & Reliability (AC-28)

### Objectives Come From The Approved Requirement
Every threshold below is an **example for a fictitious app**. Take the actual value, percentile, device class and measurement method from the approved performance requirement or product SLA. If no objective exists, record `BLOCKED (requirement: performance objective undefined)` — never adopt the sample numbers as the app's target.

| Metric | What to measure | Example objective (synthetic only) |
| :--- | :--- | :--- |
| Cold startup | process launch -> first interactive frame | p90 < 2.0s on reference device class |
| Warm startup | background resume -> interactive | p90 < 500ms |
| Frame budget | dropped frames during fling | 60fps = 16.6ms, 120fps = 8.3ms |
| Responsiveness | ANR (Android) / unresponsive main thread | no ANR; main thread block < 5s |
| Memory | growth across a defined flow | stabilizes after GC; no monotonic growth |

### Measurement Discipline
- Measure on release or profile builds. Debug builds with JIT/debug bridges distort performance metrics.
- Record device class, OS, build variant and sample count with the result; a single run is not a percentile.
- Simulator performance numbers must never be used to establish physical-device compliance.

### Battery (physical device, risk-selected)
Battery is an obligation only when the product has an approved battery/energy objective (background sync, location tracking, media playback, long-running sessions). It is never inferred from a simulator run.
1. **Precondition**: physical device, release build, documented starting charge and network/radio state, screen brightness fixed, other apps closed.
2. **Bounded action**: run the approved scenario for a fixed duration (e.g. 30 min) with the approved background behavior enabled.
3. **Measure**: OS-reported energy/battery drain (`adb shell dumpsys batterystats`, iOS Settings > Battery or Instruments Energy Log) plus the approved metric (mAh, %/hour, energy impact).
4. **Assert** the approved objective; a missing objective is `BLOCKED (requirement: battery objective undefined)`, and an unavailable physical device is `BLOCKED (device: physical battery measurement)`.
5. Simulator/emulator battery readings are `NOT RUN` for this objective — they prove nothing about hardware drain.

---

## 10. Mobile Security & Privacy Safeguards (AC-29)

1. **Secure Storage Boundaries**:
   - Auth tokens, refresh tokens, and encryption keys must reside in hardware-backed storage (`Keychain` on iOS, `Android Keystore` / `EncryptedSharedPreferences` on Android).
   - Plaintext storage in standard `UserDefaults`, `SharedPreferences`, or unencrypted SQLite is a critical defect.
2. **Session Teardown & Logout**:
   - Explicit logout must purge all secure tokens, clear cached user profile data, and reset in-memory state.
   - Where the approved contract includes a server-side/session boundary, verify it too: the refresh/session token is invalidated at the identity boundary (a subsequent call with the old token is rejected) and other devices/sessions are handled as the requirement specifies. Local purge alone does not prove logout.
   - Verify by driving the real logout entry point (menu/API call), not by calling the storage clear directly — a clear call passes even when the logout handler is broken.
   - Back navigation after logout must never expose cached authenticated screens.
3. **Sensitive Logs & Data Leaks**:
   - Audit system logs (`adb logcat`, Apple system log) during authentication and checkout flows.
   - No passwords, tokens, API keys, or unmasked PII may appear in console output.
4. **Synthetic Identities**:
   - Security verification must use synthetic test accounts only. Real user credentials or production API keys are strictly forbidden.

---

## 11. Release Candidate Smoke Verification (AC-30)

Before approving any release candidate or marking mobile verification complete:

1. **Artifact Identity**:
   - Record exact app artifact: file name, SHA-256 digest, build version, and bundle/package ID (e.g. `com.example.app` v2.4.1 build 108).
   - Record build variant and signing context (Debug, Ad-Hoc, TestFlight, Google Play Internal).
2. **Device & Driver Ledger**:
   - Record target device model, OS version, driver name and version (e.g. Appium XCUITest driver 5.12.0).
3. **Honest Reporting Gates**:
   - If signed build artifacts, physical devices, or platform automation drivers are unavailable, mark the scenario as `BLOCKED (reason)` or `NOT RUN`.
   - Never mark a mobile verification check as PASS based on responsive web execution, mocked native modules, or static analysis.

---

## 12. Failure-Safe Setup & Teardown (required for every mutating scenario)

A scenario that changes device or app state owns restoring it, **including when an assertion fails mid-scenario**. Link this contract from every platform example rather than restating it.

1. **Snapshot before mutate**: record the original device settings you will change — network/airplane mode, locale, font scale, contrast, orientation, permission grants, notification status.
2. **Restore in `finally`/teardown**: `try { scenario } finally { restore }` (JUnit `@After`, XCTest `tearDownWithError`, `addTearDown`, Patrol teardown, Jest `afterEach`). A failed offline assertion must not leave the device offline for the next run.
3. **Close owned resources**: ActivityScenario/ActivityScenarioRule via `.use { }` or `close()`; Appium sessions via `delete` (factored into the shared teardown); simulators booted by the run via `xcrun simctl shutdown`.
4. **Purge only test-owned secure state**: use a dedicated synthetic-credential file/alias/access group; delete it in teardown. Never clear the user's real keychain/keystore entries, and never leave a synthetic token behind for the next test.
5. **Do not erase preconditions mid-scenario**: upgrade/migration seeds, prior-build installs and offline queues stay until assertions finish.
6. **Report cleanup separately without rewriting the result**: record `cleanup: FAILED (reason)` as its own line. The executed scenario keeps its observed disposition (PASS/FAIL) and artifacts — never relabel an executed cell as `NOT RUN`. A cleanup failure does mark the run **incomplete** / blocks overall acceptance, and any later scenario whose preconditions are contaminated is `BLOCKED (cleanup: contaminated precondition)`, not silently re-run.
7. **Evidence first**: capture screenshot/source/logs before destructive cleanup so a failure is diagnosable.
