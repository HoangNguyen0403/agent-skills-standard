---
name: common-web-visual-testing
description: Standardizes visual audits, multi-viewport ergonomics, composited contrast, and behavioral testing for web apps. Use to verify web UI changes, responsive design across viewports, zoom reflow, or conduct comparative audits; separates automated smoke from human visual acceptance.
metadata:
  triggers:
    keywords:
      - web test
      - browser test
      - responsive audit
      - verify web ui
      - cross-browser check
      - web accessibility
      - visual testing
      - zoom reflow
---

# 🌐 Web Visual & Behavioral Testing

## **Priority: P1 (HIGH)**

> [!IMPORTANT]
> **Tier 2 (Methodology)**: Strategy web UI/UX audit, responsive inspection, rendered acceptance.
> **Tier 3 (Domain)**: Responsive, A11y (WCAG), Browser Engine quirk, Multi-viewport Ergonomics.

## 🧪 Testing Mindset: Three Evidence Lanes

Never conflate software functionality, visual design quality, and model efficacy:

1. **Functional Technical Smoke**: Automated checks (`snapshot --aria`, DOM inspection, console/network clean; form/CSRF governance ONLY when explicitly exercised). Proves observed scoped behaviors, NOT unexercised policies or visual beauty.
2. **Visual & Human Acceptance**: Real screenshot/video audit across viewports covering hierarchy, type scale, density, composited surfaces, and action reachability. Human maintainer alone grants appearance acceptance; no automated tool or score can sign off. Expert critique != user study.
3. **Model Efficacy Receipts**: Paired same-state same-viewport captures with source identity and actual loaded guidance under controlled protocol. Local refinement is not model generation efficacy.

## 🔄 Comparative Audit Loop

1. **Baseline (Before)**: Capture `snapshot --aria` + `screenshot` prod/main.
2. **Implementation (After)**: Capture same local/feature.
3. **Audit**: Compare state for visual regression, CLS, Aria drift, and side-effects. Label captures Before and After.

## 📐 Multi-Viewport & Zoom Ergonomics

- **Benchmark Defaults**: Audit across Desktop (`1440×900`), Tablet (`768×1024`), and Mobile (`375×812`). Benchmark defaults, not universal product mandates. Target sizes: minimum 24×24px (WCAG 2.5.8 AA, with spacing/inline exceptions); 44×44px is separate AAA guideline.
- **Real Screen Inspection**: Verify primary CTA reachability, content clipping, and intentional local scrolling (documented 2D exceptions like data tables permitted). DOM bounding box inside view != unclipped readable text.
- **Desktop 200% Zoom Check**: Chosen benchmark scenario for text scaling (WCAG 1.4.4); NOT complete WCAG 1.4.10 320px reflow proof. Test genuine browser-level zoom (observable zoom indicator/metrics; dSF, pageScaleFactor, or CSS viewport resize are NOT browser zoom). Record `NOT RUN: genuine browser zoom unavailable` if browser driver lacks native zoom mechanism.

## 🎨 Rendered Critique & Composited Contrast

- **Critique Loop**: `Observation → Impact (labeled hypothesis) → Smallest Change → Preserve Constraint`. Reference `common-ui-design` for token roles, palette direction, and design critique (do NOT duplicate color checklists).
- **Composited Background Contrast**: Measure WCAG AA (4.5:1 text, 3:1 large text/active UI cues) against actual composited pixels under gradients and alpha overlays across text spans, not endpoints alone. Inactive/disabled controls explicitly exempt under WCAG 1.4.3/1.4.11.
- **State Contrast**: Verify active `:hover`, `:focus-visible` (min 2px solid, 3:1 contrast against adjacent background). Automated a11y tools catch only a limited subset of issues; automated pass != complete a11y compliance.

## 📋 Scenario Matrix

| Change Type       | Scenarios to Run                                   |
| :---------------- | :------------------------------------------------- |
| **CSS/Layout**    | Multi-Viewport Audit (15) + Hover (3) + CLS Check  |
| **Forms/Input**   | Validation Msg (8) + Focus State (6) + Error (5)   |
| **Navigation**    | URL Sync + Sticky Header + 200% Zoom Check (16)    |
| **Assets/Fonts**  | Lazy Load + Icon Check + LCP / Layout Shift        |
| **Accessibility** | Tab Order + Composited Contrast (17) + Aria Diff   |
| **Visual Review** | Rendered Acceptance Walkthrough (18) + Diffs       |

## 🛡 Browser Origin & Native Form Governance

- **Native Form & State-Changing Submission Governance**: State-changing forms (login, credentials, payments) must adhere to origin policy in real browsers (standard GET/top-level navigations omit `Origin`). Never grant CORS waivers for `null` origins or bypass CSRF.
- **Actual Populated State & Narrow Scope**: Real-browser DOM assertion is required for auth/session issuance. Saved-auth (`local-auth.json`) and renderer-only fixtures (jsdom) are valid only for post-login speedup or unit layout tests, never full login governance proof.
- **Strict CSRF Enforcement**: Test harnesses must not disable CSRF middleware, origin checks, or cookies.

## 🚫 Anti-Patterns

- **Automated Aesthetic Sign-off**: Never claim tests or AI evaluation pass visual/aesthetic quality without human acceptance.
- **Single-Viewport Verification**: Never verify Desktop only. Audit mobile (375px) and tablet (768px).
- **CSS Viewport or dSF as Zoom**: Never equate window resizing, deviceScaleFactor, or CSS zoom with genuine browser zoom reflow.
- **Endpoint Contrast Assumption**: Never evaluate gradient/overlay contrast using bare CSS endpoint values.
- **DOM Bounds as Visual Proof**: Never assume bounding box containment proves unclipped readable text.
- **Conflating Smoke with Efficacy**: Never claim model uplift from local fixture refinement or passing smoke tests.
- **Synthetic Auth Illusion**: Never accept header manipulation or DOM mocks as backend auth proof.
## 📁 Evidence

Before/After pairs live in `.playwright-cli/<session>/` as `<AC|step>-before.png` / `<AC|step>-after.png` plus matching `.aria.txt`. Driver rung and dir go in walkthrough `driver:` / `evidence_dir:` lines. Mask dynamic data via `--mask` or JS (`opacity: 0`). Mock/bypass 3rd-party dependencies.

## 🔗 References

- **Rendered Acceptance Protocol**: [rendered-acceptance](references/rendered-acceptance.md) — 3 evidence lanes, viewports, zoom, contrast math.
- **Scenario Details**: [scenarios](references/scenarios.md) — step-by-step execution for scenarios 1–18.
- **UI Design Direction**: [common-ui-design](../common-ui-design/SKILL.md) — role-based tokens, palette harmony, critique.
- **playwright-cli**: [playwright-cli](../../quality-engineering/quality-engineering-playwright-cli/SKILL.md)
- **Driver Ladder**: [driver-ladder](../../quality-engineering/quality-engineering-playwright-cli/references/driver-ladder.md)
- **Diagnostic Decoder**: [diagnostic-decoder](references/diagnostic-decoder.md)
- **DOM vs Screenshot**: [dom-snapshot-vs-screenshot](references/dom-snapshot-vs-screenshot.md)
- **Login & Data**: [login-and-test-data](references/login-and-test-data.md)
