---
name: common-mobile-visual-testing
description: Standardizes mobile UI audits, performance/scroll checks, RTL verification, and state-specific testing on iOS/Android.
metadata:
  triggers:
    keywords:
    - visual test
    - mobile test
    - verify ui
    - dark mode test
    - accessibility audit
    - behavioral test
    - visual regression
    - localization test
---

# 🕵 Mobile Visual & Behavioral Testing

## **Priority: P1 (HIGH)**

> [!IMPORTANT]
> **Tier 2 (Methodology)**: Strategy for cross-platform mobile UI, lifecycle, and device audit.
> **Tier 3 (Domain)**: Native iOS, Native Android, Flutter, and React Native platforms.

## 🧪 Testing Mindset & Layer Fidelity

Analyze diff and select the correct test layer:
- **Unit / Widget / Component**: In-memory UI/logic tests (RNTL, Compose UI, Flutter Widget). Fast, but **NEVER** counts as native device verification.
- **Native Device E2E**: Real binary execution on simulator/device via Appium/XCUITest/UiAutomator/Patrol.
- **Answer**: 1. What changed? 2. What breaks? 3. Visual & behavioral audit across 10 mobile scope areas.

## 📋 Ten Mobile Testing Areas

1. **Functional/UI**: Gestures, navigation flows, and synchronization.
2. **Lifecycle/State**: Warm resume, retained recreation (config change) vs real process replacement/relaunch; saved-state reconstruction.
3. **Device/OS Matrix**: Justified matrix (smallest/largest screen, tablet, min supported OS).
4. **Permissions/Platform**: Dual-path (allow/deny/revoke), priming dialogs, deep link routing.
5. **Offline/Sync**: Network loss, optimistic UI, idempotent sync, spec-defined conflict policy.
6. **Install/Upgrade**: Clean install (`fullReset`) vs upgrade migration (`noReset` + DB migration).
7. **Accessibility/Presentation**: VoiceOver/TalkBack, Dynamic Type, Safe Area, soft keyboard.
8. **Performance/QoS**: Cold/warm startup, scroll jank/FPS, ANR/crashes, memory leaks; battery only with an approved objective on a physical device.
9. **Security/Privacy**: Hardware-backed secure storage (Secure Enclave / Keystore / encrypted preferences), logout cleanup, no log PII.
10. **Release Smoke**: SHA-256 build artifact digest, signing context, device ledger, honest BLOCKED reporting.

## 🛠️ Core Tool Mapping

| Scenario | Appium Tool / Verification |
| :--- | :--- |
| **System Alert / Permission** | `appium_alert` (verify dialog; never auto-dismiss tested prompt) |
| **Performance / QoS** | `appium_mobile_performance_data` (CPU/Mem/FPS during flow) |
| **Visual Check** | `appium_screenshot` (base/diff; mask dynamic tokens) |
| **Layout & A11y Audit** | `appium_get_page_source` (validate hierarchy, labels, safe area) |
| **App Lifecycle** | `appium_app_lifecycle` (background, terminate, activate, deep_link) |

## 🚫 Anti-Patterns

- **Browser/Mock Substitution**: Never treat browser viewport emulation or mocks as native device verification.
- **Silent Reset Flipping**: Never switch from `fullReset` to `noReset` to mask clean-install/migration failures.
- **Alert Suppression**: Never auto-dismiss or bypass permission dialogs being tested.
- **Ignoring QoS**: Apps crash/lag under load. MUST check QoS from performance data.
- **Blind Tap / Happy-Path Bias**: Never ignore empty, loading, error states, or tap without verifying state.
- **Single-Device Tunnel Vision**: Generalizing one simulator pass to all platforms is forbidden.

## 📁 Evidence (C6 Alignment)

Record: app artifact SHA-256 digest, build variant, target device/OS, driver rung, and reset mode. `.appium-mcp/<session>/` holds `<AC|step>-<before|after>.png`, `<label>.source.xml`, `perf.json`, and `video.url`. Unavailable hardware/drivers must be reported as `BLOCKED (driver: appium)`.

## 🔗 References

- **Coverage Matrix**: [mobile-testing-matrix](references/mobile-testing-matrix.md) — 10 areas × 4 stacks, expected-outcome sourcing (§0), failure-safe teardown (§12).
- **Scenario Details**: [scenarios](references/scenarios.md) — 20 end-to-end mobile procedures.
- **Appium MCP**: [appium-mcp](../../quality-engineering/quality-engineering-appium-mcp/SKILL.md)
- **Driver Ladder**: [driver-ladder](../../quality-engineering/quality-engineering-appium-mcp/references/driver-ladder.md)
