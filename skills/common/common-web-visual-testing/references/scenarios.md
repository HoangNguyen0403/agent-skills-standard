# Web Testing Scenarios (Detailed)

Pick from the matrix in `SKILL.md`. Each scenario lists: **Trigger**, **Steps**, **Pass criteria**.

---

## 1. Visual baseline

**Trigger:** any UI change.
**Steps:** navigate → wait for content → hover the proof element → screenshot.
**Pass:** rendered output matches design/AC. Read screenshot at full resolution.

---

## 2. Click + open (modal, dropdown, panel)

**Trigger:** clickable element that reveals UI.
**Steps:** click trigger → snapshot to confirm panel in DOM → screenshot if visible.
**Pass:** panel renders with expected children; no console errors; z-index correct.

---

## 3. Hover state

**Trigger:** element with `:hover` styling, tooltip, or revealed control.
**Steps:** snapshot before → hover → snapshot after.
**Pass:** hover-only DOM additions visible (e.g. delete buttons in row hover).

---

## 4. Empty state

**Trigger:** list/grid that can be empty.
**Steps:** force empty → snapshot → screenshot.
**Pass:** empty-state component renders (icon + title + note). **Empty wrapper does NOT render as a stray rectangle.**

---

## 5. Error path

**Trigger:** flow that can fail.
**Steps:** trigger error condition → snapshot → check console for matching error class.
**Pass:** error UI shows right message; no unhandled exceptions; user can recover.

---

## 6. Focus state

**Trigger:** focusable inputs, buttons, links.
**Steps:** click/tab to focus → snapshot.
**Pass:** focus ring renders, related UI updates. **Dropdown WRAPPER must not render empty visible strip.**

---

## 7. Z-order / overlay

**Trigger:** modals, dropdowns, tooltips, sticky headers.
**Steps:** open overlay → screenshot → check covered elements aren't reachable.
**Pass:** overlay obscures background; no clickable element behind it.

---

## 8. Field validation

**Trigger:** form inputs with min/max length, format, required fields.
**Steps:** fill invalid value → blur or submit → snapshot for error message.
**Pass:** error message shown next to field; submit blocked when invalid.

---

## 9. Scroll / load more / infinite scroll

**Trigger:** lists with pagination or infinite scroll.
**Steps:** initial snapshot → scroll to bottom → poll snapshot for next-page items.
**Pass:** new items render; no duplicates; loading indicator transitions.

---

## 10. Multi-account fallback (login)

**Trigger:** any test requiring authentication.
See [login-and-test-data.md](login-and-test-data.md). STOP after 3 failed attempts.

---

## 11. Locale switch

**Trigger:** market/language-conditional rendering.
**Steps:** switch locale → snapshot → check translated strings.
**Pass:** all visible text in target locale; no English fallbacks; layout doesn't break.

---

## 12. RTL

**Trigger:** Arabic/Hebrew/RTL locale.
**Steps:** switch to RTL locale → snapshot → screenshot.
**Pass:** layout mirrors (icons, padding, text alignment flipped); no LTR leakage.

---

## 13. DOM-snapshot pixel-scale

**Trigger:** CSS fixes targeting 1–3 px strips, hairlines, missing border-radius.
**Steps:** `snapshot | grep <element-id>` BEFORE fix → apply fix → snapshot AGAIN → diff.
**Pass:** offending element is absent from DOM (or restyled).
See [dom-snapshot-vs-screenshot.md](dom-snapshot-vs-screenshot.md).

---

## 14. Console / network audit

**Trigger:** any verification (run alongside other scenarios).
**Steps:** `console` + `network` after navigation.
**Pass:** No BLOCKING console errors (`Hydration failed`, `Uncaught`, etc.). Main doc HTTP `< 400`.

---

## 15. Multi-viewport responsive audit

**Trigger:** Any layout, page, or responsive component change.
**Steps:** Render interface across benchmark defaults: 1440×900 (desktop), 768×1024 (tablet), and 375×812 (mobile) → check primary CTA discoverability/reachability, touch targets (≥24×24px WCAG 2.5.8 AA, with spacing/inline exceptions; 44×44px AAA is separate guideline), content clipping, and unintentional horizontal overflow → capture full-resolution screenshot at each viewport.
**Pass:** Primary task actions immediately reachable; no clipped text or obscured controls; touch targets meet minimums; local scroll areas deliberate (e.g. wide data tables).

---

## 16. Desktop 200% zoom check (text scaling & reflow)

**Trigger:** Page layout, form, modal, or reading flow verification.
**Steps:** Apply genuine browser-level 200% zoom on desktop (1440×900) using verified native zoom shortcuts/mechanisms with observable zoom metrics → verify text scaling and reflow. Note: this is a chosen benchmark scenario for text scaling (WCAG 1.4.4), NOT complete WCAG 1.4.10 320px reflow proof. If harness lacks genuine browser-level zoom, record status explicitly as `NOT RUN: genuine browser zoom unsupported by driver` (do NOT substitute window resize, dSF, or CSS zoom).
**Pass:** Body text reflows without 2D scrolling; sticky headers/footers do not occlude interactive fields; actions remain operable. Documented 2D content exceptions (e.g. data tables, maps, diagrams) may provide intentional horizontal scrolling.

---

## 17. Composited surface & state contrast audit

**Trigger:** Components with gradients, alpha overlays, backdrop filters, or custom interactive states.
**Steps:** Sample foreground text against actual composited pixel background (across gradient spans, not endpoints alone; under translucent overlays) → inspect active `:hover` and `:focus-visible` states → verify focus indicators against adjacent surfaces. Note: Inactive/disabled controls and purely decorative elements have NO contrast requirement under WCAG 1.4.3/1.4.11.
**Pass:** Active normal text ≥ 4.5:1, large text ≥ 3:1, focus ring and active UI state cues ≥ 3:1 against composited surfaces; visible focus indicator min 2px solid; color not sole state indicator; inactive/disabled controls exempt. Automated tool passes noted as catching only a limited subset of accessibility requirements.

---

## 18. Human visual acceptance walkthrough

**Trigger:** Proposed UI improvement, demonstration candidate, or visual redesign.
**Steps:** Assemble paired before/after screenshots across 1440×900, 768×1024, and 375×812 → document `Observation → Impact (labeled hypothesis) → Smallest Change → Preserve Constraint` → present to project maintainer.
**Pass:** Maintainer explicitly grants visual acceptance. Automated test scripts or AI heuristic ratings can prove functional smoke, but NEVER grant aesthetic or visual sign-off.
