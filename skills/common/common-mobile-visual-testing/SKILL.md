---
name: common-mobile-visual-testing
description: Standardizes mobile UI audits, RTL verification, and state-specific testing on iOS/Android.
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

# 🕵️‍♂️ Mobile Visual & Behavioral Testing

## **Priority: P1 (HIGH)**

> [!IMPORTANT]
> **Tier 2 (Methodology)**: Strategy mobile UI/UX audit.
> **Tier 3 (Domain)**: i18n, A11y (Dynamic Type), Platform (Notch/RTL).

## 🧪 Testing Mindset

Analyze diff + answer:
1.  **Change?** (Affected screen, logic path)
2.  **Break?** (Regression, state transition)
3.  **Visual Audit**: Truncate, align, z-order, color.
4.  **Behavioral Audit**: Tap target, nav, data accuracy.

## 📋 Scenario Matrix

| Change Type | Scenarios to Run |
| :--- | :--- |
| **UI/Styling** | Visual Audit + Dark Mode + QoS Check (CPU/Mem) |
| **Navigation** | User Flow + Deep Link + Z-Order |
| **Lists/Grids** | Scroll Test + Pagination + Empty State |
| **i18n/Locale** | RTL + Truncate + Locale Logic |
| **Accessibility** | Dynamic Type + High Contrast + Permission Reason |

## 🛠️ Core Tool Mapping

| Scenario | Appium Tool |
| :--- | :--- |
| **System Alert** | `appium_alert` (check hierarchy first) |
| **Performance** | `appium_mobile_performance_data` (monitor during flow) |
| **Visual Check** | `appium_screenshot` (base/diff) |
| **Layout Audit** | `appium_get_source` (hierarchy/aria) |

## 🚫 Anti-Patterns

- **Ignore QoS**: Apps crash/lag under load. **MUST** check `appium_mobile_performance_data` (scroll/video).
- **Blind Tap**: Check state before interact. Use `appium_screenshot`.
- **Alert Paralysis**: Unexpected alert? Use `appium_alert` → `accept`/`dismiss`.
- **Happy-Path Bias**: Never ignore Empty, Loading, or Error state.
- **Deep Link Neglect**: Verify "Cold Start" via deep link.
- **Single-Device Tunnel Vision**: Verify smallest/largest screen size.

## 🔗 References

- **appium-mcp**: [appium-mcp](../../quality-engineering/quality-engineering-appium-mcp/SKILL.md)
- **Scenario Details**: [scenarios](references/scenarios.md)
