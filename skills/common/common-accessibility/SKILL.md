---
name: common-accessibility
description: "Enforce WCAG 2.2 AA compliance with semantic HTML, ARIA roles, keyboard navigation, and color contrast standards for web UIs. Use when building interactive components, adding form labels, fixing focus traps, or auditing a11y compliance. (triggers: **/*.tsx, **/*.jsx, **/*.html, **/*.vue, **/*.component.html, accessibility, a11y, wcag, aria, screen reader, focus, alt text)"
---
# Common Accessibility (a11y) Standards

## **Priority: P1 (OPERATIONAL)**

> Accessibility legal requirement in EU (Web Accessibility Directive), USA (ADA/Section 508), and many other jurisdictions. Non-compliance carries litigation risk. Target **WCAG 2.2 Level AA** as minimum.

## 🏗 Semantic HTML First

- Use correct HTML element before reaching for ARIA. `<button>`, `<a>`, `<nav>`, `<main>`, `<section>`, `<form>`, `<label>` convey semantics natively.
- Never use `<div>` or `<span>` for interactive elements — they no keyboard role by default.
- Headings (`h1`–`h6`) must form logical outline. One `h1` per page.

- Use `<button>` not `<div onClick>`, `<a>` not `<span onClick>`, etc.

## 🎭 ARIA — Use Sparingly

ARIA supplements semantics when native HTML insufficient (e.g., custom widgets). Rules:

1. **No ARIA > Bad ARIA**: If native HTML works, use it. ARIA only adds roles, not behavior.
2. **Required attributes**: Every `role` with required properties must include them (e.g., `role="slider"` needs `aria-valuenow`, `aria-valuemin`, `aria-valuemax`).
3. **Live Regions**: Use `aria-live="polite"` for status messages; `aria-live="assertive"` only for critical alerts.
4. **Labels**: Every form control must programmatic label (`<label>`, `aria-label`, or `aria-labelledby`).
5. **Hidden content**: Use `aria-hidden="true"` on decorative icons; never on focusable elements.

## ⌨️ Keyboard Navigation

- All interactive elements MUST reachable and operable via keyboard.
- Tab order must follow visual reading order. Never use positive `tabindex` values (`tabindex="1"` breaks natural order).
- Provide visible focus indicators (see Focus style rule below).
- **Modals/Dialogs**: Trap focus inside when open. Return focus to trigger element on close.
- **Escape key**: Must close modals, dropdowns, and tooltips.
- **Focus style**: Never `outline: none` without visible replacement (min 2px solid, 3:1 contrast).

## 🎨 Color & Contrast

- Normal text: ≥ 4.5:1 ratio. Large text (≥ 18pt or 14pt bold): ≥ 3:1. UI components: ≥ 3:1.
- Never convey information through color alone — add icon, pattern, or text label.
- Test with: axe DevTools, WAVE, Lighthouse.

## 📐 Touch & Pointer Targets

- Minimum interactive target size: **44×44px** (WCAG 2.5.5 AAA) / **24×24px** minimum (WCAG 2.2 AA).
- Provide sufficient spacing between adjacent targets to prevent mis-taps.

## 🖼 Images & Media

- Decorative images: `alt=""` (empty, not missing).
- Informative images: descriptive `alt` text (what image conveys, not "image of...").
- Complex charts/graphs: provide text summary or data table alternative.
- Video: Captions mandatory. Audio descriptions for visual-only content.

## 🧪 Testing Minimum

- CI gate: `axe-core` zero critical violations.
- Manual: keyboard-only full flow + screen reader (NVDA/VoiceOver) + 200% zoom.

## Anti-Patterns

- **No `onClick` on `<div>`**: Use `<button>` or add `role`, `tabindex`, and keyboard handlers.
- **No missing `alt`**: Every `<img>` must `alt` attribute (empty string if decorative).
- **No color-only status**: Red = error must also show icon or text.
- **No `outline: none`** without replacement focus style.
- **No auto-playing media**: Users with vestibular disorders may harmed.
- **No dynamic content without announcement**: Use `aria-live` for async status updates.

## References

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/)