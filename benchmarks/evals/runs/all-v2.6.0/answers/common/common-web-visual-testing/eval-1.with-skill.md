Assumption: a Before capture and the fixed build are available at the same header route.

Verification:

1. **Before**: capture `playwright-cli snapshot --aria` and a screenshot at desktop, 375px mobile, and 768px tablet.
2. **After**: repeat the same captures on the fixed build.
3. Compare the dropdown border in each viewport:
   - Border is visible, continuous, and aligned with the dropdown.
   - No color, thickness, radius, clipping, or z-index regression.
   - No neighboring-element movement or layout shift (CLS), including loading state.
4. Test hover, keyboard focus, open/close behavior, and Tab order.
5. Recheck the `aria-snapshot` for unchanged trigger/menu semantics and verify color contrast.
6. Repeat in Chromium, Firefox, and WebKit; mask dynamic content with `--mask` or `opacity: 0`.

The fix passes only if the **After** screenshots show the corrected border at 375px, 768px, and desktop widths, with no visual diff or neighboring-element side effects beyond the intended border change.
