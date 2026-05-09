---
name: common-web-visual-testing
description: Standardizes visual audits, responsive design, and behavioral testing for web apps.
metadata:
  triggers:
    keywords:
    - web test
    - browser test
    - responsive audit
    - verify web ui
    - cross-browser check
    - web accessibility
---

# 🌐 Web Visual & Behavioral Testing

## **Priority: P1 (HIGH)**

> [!IMPORTANT]
> **Tier 2 (Methodology)**: Strategy web UI/UX audit.
> **Tier 3 (Domain)**: Responsive, A11y (WCAG), Browser Engine quirk.

## 🧪 Testing Mindset (Comparative Audit)

Visual test best as **Comparative Audit** loop:
1.  **Baseline (Before)**: Capture `snapshot --aria` + `screenshot` prod/main.
2.  **Implementation (After)**: Capture same local/feature.
3.  **Audit**: Compare state for regression, CLS, Aria drift.

## 📋 Scenario Matrix

| Change Type | Scenarios to Run |
| :--- | :--- |
| **CSS/Layout** | Responsive Audit + Hover + CLS Check |
| **Forms/Input** | Validation Msg + Focus State + Error Boundary |
| **Navigation** | URL Sync + Sticky Header + Back-Button Persistence |
| **Assets/Fonts** | Lazy Load + Icon Check + LCP Audit |
| **Accessibility** | Tab Order + Aria-Snapshot + Color Contrast |

## 🚫 Anti-Patterns

- **Single-Viewport**: Never verify Desktop only. Check Mobile (375px) + Tablet (768px).
- **Ignore Layout Shift**: Check loading state (skeleton) → no page jump.
- **Unmasked Dynamic**: **MUST** mask timestamp/balance via `--mask` or JS (`opacity: 0`). Avoid "False Regression".
- **Blind Assertion**: Use `playwright-cli snapshot --aria` verify state before done.
- **External Dependency**: Mock/bypass 3rd-party (Chat, Analytics) → prevent flakiness.

## 🔗 References

- **playwright-cli**: [playwright-cli](../../quality-engineering/quality-engineering-playwright-cli/SKILL.md)
- **Diagnostic Decoder**: [diagnostic-decoder](references/diagnostic-decoder.md)
- **DOM vs Screenshot**: [dom-snapshot-vs-screenshot](references/dom-snapshot-vs-screenshot.md)
- **Login & Data**: [login-and-test-data](references/login-and-test-data.md)
- **Scenario Details**: [scenarios](references/scenarios.md)
