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
