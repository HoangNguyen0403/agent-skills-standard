# Rendered Visual Acceptance & Evidence Protocol

Complements `SKILL.md`. Defines requirements for separating functional smoke from visual acceptance, multi-viewport inspection, 200% browser zoom reflow, and composited contrast audits.

---

## 1. Three Distinct Evidence Lanes

Never conflate software functionality, visual design quality, and model efficacy. Every verification run must classify its evidence into the correct lane:

| Evidence Lane | What It Proves | What It CANNOT Prove | Required Evidence Artifacts |
| :--- | :--- | :--- | :--- |
| **Lane 1: Functional Technical Smoke** | Code executes; DOM/ARIA trees populate; forms submit; network/console clean; origin/CSRF policies enforced ONLY WHEN EXPLICITLY EXERCISED. Proves observed scoped behaviors only. | Unexercised backend security policies, aesthetic quality, layout harmony, typographic clarity, visual hierarchy, or user delight. | DOM snapshot (`snapshot --aria`), console logs, HTTP status codes, test script pass/fail receipts for exercised paths. |
| **Lane 2: Visual & Human Acceptance** | Screen composition works for the task across viewports; hierarchy, type scale, density, and composited surfaces are balanced; maintainer approves appearance. | Statistical model efficacy, generalizable prompt quality, or broad end-user usability. | Rendered full-res screenshots at 1440×900, 768×1024, 375×812; before/after diffs; explicit human sign-off statement. |
| **Lane 3: Measured Model Efficacy** | A specific prompt/guidance arm consistently improves generated UI outputs across independent trials compared to a baseline arm. | Guaranteed perfection on unseen tasks; universal cross-model superiority without testing. | Pinned source revisions, loaded guidance identity, paired same-state same-viewport captures, blinded independent evaluations. |

> [!CRITICAL]
> **No Automated Aesthetic Sign-off**: Passing test scripts, DOM assertions, or automated LLM self-evaluations cannot grant aesthetic or visual acceptance. Human maintainers alone supply appearance sign-off.
> **Expert Review ≠ User Research**: Expert heuristic critique identifies defects and trade-offs, but does not substitute for empirical end-user usability studies or business conversion metrics.

---

## 2. Multi-Viewport Responsive Ergonomics

### Benchmark Defaults
When conducting comparative audits or benchmark evaluations, test these three standard viewports:
- **Desktop**: `1440 × 900 px` (evaluates wide-screen composition, sidebars, dense data tables)
- **Tablet**: `768 × 1024 px` (evaluates vertical stacking, drawer transitions, tablet ergonomics)
- **Mobile**: `375 × 812 px` (evaluates single-column flow, reachability of primary actions, touch targets)

*Note: These are benchmark defaults for consistent evaluation, not universal requirements for every embedded widget or niche viewport.*

### Inspection Criteria
At each viewport, verify:
1. **Primary Journey Reachability**: The primary call-to-action (CTA) and core task flow remain immediately discoverable without searching through unexpected decorative elements.
2. **Content Clipping & Bounds**: No text strings, cards, or controls are truncated or cut off by container bounds.
3. **Touch Targets**: Interactive controls maintain minimum 24×24px target size (WCAG 2.5.8 Level AA, with spacing, inline, and essential exceptions); 44×44px is a separate Level AAA enhanced guideline (WCAG 2.5.5) — do not conflate or overstate.
4. **Deliberate Scrolling**: Prevent accidental horizontal scrolling (`overflow-x: hidden` masks bugs; inspect element layout widths). Local scroll areas (e.g. data tables) must be clearly discoverable and navigable.

---

## 3. Desktop 200% Zoom & WCAG Reflow Distinction

### Standard Distinctions
- **WCAG 1.4.4 Resize Text (Level AA)**: Text must be resizable up to 200% without assistive technology and without loss of content or functionality.
- **WCAG 1.4.10 Reflow (Level AA)**: Content must reflow at 320 CSS px width (often tested at 1280px viewport width at 400% zoom) without loss of information or functionality, and without requiring scrolling in two dimensions—except for parts of the interface where 2D scrolling is essential (such as data tables, maps, diagrams, video players, and code editors).
- **Our Benchmark 200% Scenario**: Auditing desktop layouts at 200% zoom is a chosen project verification scenario for desktop ergonomics and text scaling; it is **NOT** a full proof of WCAG 1.4.10 320px reflow compliance.

### Genuine Browser Zoom vs. Viewport / Scaling Approximations
- **Genuine Browser Zoom**: Invoked via browser UI shortcuts (e.g. `Ctrl/Cmd + +`) or browser-native zoom menus, altering both layout scale and font rasterization with an observable zoom level indicator and responsive viewport metrics.
- **Invalid Approximations**: `deviceScaleFactor`, CDP `pageScaleFactor`, CSS `zoom`, or browser window resizing (e.g. resizing 1440px to 720px) are **NOT** genuine browser-level zoom.
- **Verification Rule**: If the test runner or browser automation harness does not expose a verified native browser zoom mechanism with observable zoom metrics, record:
  `Desktop 200% Zoom: NOT RUN: genuine browser-level zoom mechanism unavailable`
  *Never claim a passing CSS viewport resize or deviceScaleFactor change is a 200% browser zoom pass.*

### Inspection & 2D Content Exceptions
When genuine 200% zoom is verified:
1. Standard body text, navigation links, and primary form workflows must reflow without requiring horizontal scrolling or clipping.
2. Sticky headers, fixed footers, and modal dialogs must not occlude interactive inputs or primary action buttons.
3. Interfaces with legitimate 2D content (e.g. wide data tables, charts, diagrams) are valid exceptions under WCAG and may provide deliberate horizontal scrolling for those specific components; do not mandate single-column layout universally.

---

## 4. Composited Surface & State Contrast

### Composited Backgrounds
Calculating contrast from bare CSS color tokens or static hex codes is invalid when surfaces use:
- Semi-transparent overlays (`rgba()`, `hsla()`, `opacity`)
- CSS gradients (`linear-gradient()`, `radial-gradient()`)
- Layered cards or backdrop filters (`backdrop-filter: blur()`)

**Rule**: Contrast must be measured against the **actual composited pixel background** under the text.
- For gradients: verify contrast across the entire text area, not just at favorable gradient endpoints. A gradient that passes contrast at the left edge may fail in the center or right edge.
- For modal/drawer backdrops: inspect dimmed content behind scrims to verify proper occlusion.

### State & Non-Text Contrast (Active Controls vs. Disabled Exceptions)
- **Active Text Contrast**: Normal text requires $\ge$ 4.5:1; large text (18pt+ or 14pt+ bold) requires $\ge$ 3:1 against composited backgrounds (WCAG 1.4.3).
- **Active Non-Text UI Indicators**: Active form control boundaries, checkboxes, radio buttons, switch toggles, and state icons require $\ge$ 3:1 contrast against adjacent surfaces where required (WCAG 1.4.11).
- **Focus Rings**: Keyboard focus outlines must achieve at least 3:1 contrast against adjacent background colors, with a minimum 2px solid thickness.
- **Disabled / Inactive Controls Exception**: Under WCAG 1.4.3 and WCAG 1.4.11, **inactive or disabled controls and purely decorative elements have NO contrast requirement**. Do not flag low-contrast disabled buttons or inactive text as contrast defects.
- **Automated Tool Bounds**: Automated accessibility checkers (axe, Lighthouse) detect only a limited subset of WCAG criteria and cannot inspect context-dependent or subjective requirements. Zero automated violations does NOT prove full accessibility compliance.

---

## 5. Rendered Critique Loop

When conducting visual reviews of candidate or refined designs:
1. **Observation**: State the exact element, viewport, state, and rendered visual symptom (e.g., "At 375×812 mobile, the primary CTA button starts below y=1100px, placed beyond the initial viewport fold").
2. **Impact (Hypothesis)**: Clearly label the user or task consequence as an observed fact or a design hypothesis (e.g., "[Design Hypothesis] Users attempting to book a workshop may miss the reservation button").
3. **Smallest Change**: Propose the minimal layout, spacing, or typographic change that resolves the issue without introducing new dependencies or broad refactors.
4. **Preserve Constraint**: Ensure the fix preserves existing brand constraints, functional contracts, keyboard flows, and accessibility semantics.
5. **UI Design Reference**: For palette selections, tone attributes, and typography pairing principles, consult `common-ui-design/SKILL.md` and `references/tones.md`. Do not duplicate color theory checklists inside testing suites.

---

## 6. Normative Primary Sources & Method Scoping

Our benchmark native browser 200% zoom check is a chosen project verification scenario with a stricter method requirement for automated browser drivers than general WCAG-allowed text-sizing methods. It evaluates desktop ergonomics and layout resilience; it is a chosen scenario, not the sole normative method for all WCAG compliance.

Primary W3C references:
- [W3C WCAG 2.2 Understanding 1.4.4: Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html) — 200% text resizing without loss of content or functionality.
- [W3C WCAG 2.2 Understanding 1.4.10: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) — 320 CSS px reflow (often tested at 1280px at 400% zoom) with explicit 2D content exceptions (data tables, maps, diagrams, code blocks).
- [W3C WCAG 2.2 Understanding 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) — 4.5:1 normal text, 3:1 large text, explicit exemption for inactive/disabled controls and decorative elements.
- [W3C WCAG 2.2 Understanding 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) — 3:1 for active UI components and graphical objects; inactive controls exempt.
- [W3C WCAG 2.2 Understanding 2.5.8: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) — 24×24px minimum with spacing/inline exceptions (Level AA); distinct from 44×44px enhanced target size (WCAG 2.5.5 Level AAA).
