---
name: quality-engineering-appium-mcp
description: Drives iOS/Android mobile devices via Appium MCP. Runs a preflight, picks local emulator/simulator/USB or a device cloud, captures screenshots/page source into a named evidence dir. Use for verifying mobile bugs, E2E tests, and navigating real device clouds (LambdaTest/BrowserStack).
metadata:
  triggers:
    keywords:
    - appium
    - appium-mcp
    - appium doctor
    - android emulator
    - ios simulator
    - select_device
    - mobile verify
    - android verify
    - ios verify
    - lambdatest
    - real device cloud
    - flutter widget tap
---

# 📱 Appium MCP (Mobile Automation)

## **Priority: P1 (HIGH)**

> [!IMPORTANT]
> **Tier 0 (Infrastructure)**: Session creation, device farm connectivity, basic OS interactions.
> **Tier 1 (Core Gestures)**: Taps, swipes, text input for native mobile elements.
> **Tier 2 (Flutter/Single-Canvas)**: Visual-first automation via screenshot + coordinate taps.

## 🔌 Activation

**Triggers**: `appium`, `appium-mcp`, `appium doctor`, `mobile verify`, `android verify`, `ios verify`, `lambdatest`, `real device cloud`, `flutter widget tap`.

## 🪜 Driver Ladder

1. `sh scripts/preflight.sh` — prints `MODE: local | local,remote | remote | none`; exit 0 usable, 2 not.
2. Local: `select_device` (Android) or `prepare_ios_simulator` (iOS), embedded drivers. Needs Node 22+, JDK 8+ / Xcode.
3. Cloud: `remoteServerUrl` (LambdaTest/BrowserStack). URL must match `REMOTE_SERVER_URL_ALLOW_REGEX`.
4. Neither: ask for exported screenshots or cloud video link; label `human-provided`.
5. Nothing exported: return `BLOCKED (driver: appium)`, continue other lanes.

`NO_UI=true` default; `AI_VISION_ENABLED=true` only for Flutter/canvas. Local single-user or trusted CI only. `generate_locators` / `appium_generate_tests` feed `test-loop` step 4. Full table: [driver-ladder](references/driver-ladder.md).

## 🛠 Core Workflow (Goal-Oriented)

| Step | Tool | Purpose |
| :--- | :--- | :--- |
| 0 | `select_device` / `prepare_ios_simulator` | Pick target per ladder rung; cloud skips this. |
| 1 | `appium_session_management` (`create`) | Open session. **Resiliency**: Retry with `noReset: true` on failure. |
| 2 | `appium_get_window_size` | Scale coordinates for high-density displays. |
| 3 | `appium_screenshot` | Capture visual state for **Semantic Reasoning**. |
| 4 | `appium_gesture` / `appium_set_value` | Interact. **Self-Healing**: Re-scan hierarchy if UUID stale. |
| 5 | `appium_session_management` (`delete`) | **MANDATORY Cleanup**. |

## 💡 AI-Driven Methodologies
- **Semantic Intent**: Find element in hierarchy (e.g., "Login button") instead of raw coordinates. Resilient to layout shifts.
- **Dynamic Handling**: Unexpected pop-up appears? Pause, reason about alert, dismiss, resume.
- **Visual Anchors**: Find stable "Anchor" (e.g., Header) and derive coordinates relative to it.

## 🚫 Anti-Patterns (Zero-Tolerance)

- **Hardcoded XPaths**: Use `accessibility id` or `uiautomator`. XPath flaky.
- **Implicit Wait-Only**: Never assume page loaded. Poll for "Source of Truth" element.
- **Ignoring QoS**: Audit CPU/Memory via `appium_mobile_performance_data`. Prevent lag/crashes.
- **Orphaned Sessions**: Teardown mandatory. Call `delete` in cleanup block.

## 📁 Evidence

`.appium-mcp/<session>/`: `<AC|step>-<before|after>.png` (nav shots at `maxWidth` budget, verdict full-res), `<label>.source.xml` from `appium_get_page_source`, `perf.json`, `video.url`. Walkthrough records `driver:` + `evidence_dir:`.

## ✅ Evaluation Criteria

- **Cleanup Rate**: 100% session closure.
- **Visual Accuracy**: Coordinate-based taps land within 5% of target center.
- **Security**: No secrets in tool arguments or logs.

## 🔗 References

- **Visual Testing**: [common-mobile-visual-testing](../../common/common-mobile-visual-testing/SKILL.md) — Methodology for what to verify.
- **Driver Ladder**: [driver-ladder](references/driver-ladder.md) — prerequisites per rung, server env, canonical tools.
- **LambdaTest Setup**: [lambdatest-cloud-setup](references/lambdatest-cloud-setup.md) — RDC configuration.
- **Tool Cheatsheet**: [tool-cheatsheet](references/tool-cheatsheet.md) — Fast copy-paste args.
- **Project Context**: [project-context](references/project-context.md) — Project-specific overlays/macros.
