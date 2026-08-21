# Mobile Testing Scenarios (1–14)

Detailed descriptions for each scenario.

## 1. Visual Verification (every UI change)

- Wait for animations to settle before capturing.
- Capture **before state** (screenshot + hierarchy), navigate, capture **after state**.
- Check against defect taxonomy in SKILL.md.
- Use real/long-form data — placeholders hide truncation bugs.
- Mask dynamic content (timestamps, balances) when comparing.

## 2. Behavioral Flow Testing (feature changes)

- Walk through **complete user journey**.
- After each action, verify screen transition — a tap with no visual change is a bug.
- Test all states: success, empty data, loading, and error.

## 3. Dark Mode

- Screenshot light mode → switch to dark → screenshot → compare.
- Check: dark-on-dark text, missing themed colors, hard-coded backgrounds.

## 4. Scroll & List

- Screenshot initial list → scroll down (pagination) → scroll further (duplicates/gaps) → scroll back up.

## 5. Multi-Device

- Test **smallest** and **largest** phone form factors.
- Test on **tablet** — layout adapts, no overflow.

## 6. Location-Based

- Set GPS to target market, screenshot, change market, compare.

## 7. Error Path & Recovery

- Background → reopen (state preserved), back gesture (no crash), offline mode.

## 8. Video Recording

- Record before → stop after — attach as evidence for complex flows.

## 9. Accessibility Audit

- View hierarchy: labels exist, descriptive, touch targets 44x44pt+.

## 10. Orientation (portrait/landscape)

- Screenshot portrait → rotate landscape → screenshot. Verify no overflow.

## 11. Dynamic Type / Font Scaling

- Set system font size to **largest accessibility size**.
- Verify: text wraps (not clips), buttons tappable, layout intact.

## 12. Localization & RTL Layout

- Switch to **long-string language** (German, Thai) — verify no clipping.
- If RTL (Arabic, Hebrew) — verify layout mirrors correctly.

## 13. State-Specific Visual Testing

Capture each state as a **separate visual proof**:
- **Empty state**: illustration, text, CTA visible.
- **Loading state**: skeleton/spinner renders correctly.
- **Error state**: message visible (not off-viewport), actionable CTA.
- **Success state**: confirmation renders with correct data.

## 14. High Contrast / Accessibility Display

- Enable **Increase Contrast** mode — UI remains readable, borders visible.
- Test combined: largest font + high contrast together.

---

## §overlay — Marketing/Analytics Overlay Interference

SDKs (CleverTap, Braze, Firebase) render overlays that:
- Intercept taps meant for app UI.
- Re-fire on screen transitions.

**Strategies:**
1. **Pause campaigns** for test device in SDK dashboard.
2. **Defensive dismiss** after every navigation: re-snapshot, find the close button near top-right, tap by frame coords.

## §overflow — Default-Viewport Widget Tests Hide Overflow

Flutter's default test viewport is 800×600 — wider than any phone.

**Add for any layout that may overflow:**
```dart
Intl.defaultLocale = 'vi'; // longest target locale
expect(tester.takeException(), isNull);
```

**Optional**: simulate the smallest target device:
```dart
tester.view.physicalSize = Size(width * dpr, height * dpr);
```
