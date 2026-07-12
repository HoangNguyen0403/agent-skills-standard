Use a comparative visual audit, not a single screenshot check.

For a broken dropdown border in the header, the right verification path is:

1. Capture the baseline in the broken state.
   - Open the page at desktop, tablet (768px), and mobile (375px).
   - Take an ARIA snapshot before interaction.
   - Click the header dropdown trigger.
   - Take another ARIA snapshot and a screenshot.

2. Verify the specific scenarios that match this bug.
   - Click + open: confirm the dropdown panel appears in the DOM with the expected children.
   - Z-order / overlay: confirm the dropdown is layered above the header/body correctly and nothing behind it is still interactable.
   - Focus state: if the trigger or search field gains focus, confirm no empty wrapper or thin strip renders.
   - Responsive audit: repeat on 375px and 768px, because header borders and wrappers often regress only at smaller breakpoints.

3. Use DOM snapshot as the primary proof if the defect is a thin border, hairline, or stray strip.
   - Pixel-scale border bugs can disappear in downsampled screenshots.
   - If the issue is a 1–3 px border artifact, inspect the snapshot for the offending wrapper/container rather than trusting the screenshot alone.
   - If the wrapper still exists in the DOM when it should not, the fix is incomplete even if the screenshot looks clean.

4. Run console and network checks alongside the visual pass.
   - No blocking console errors.
   - Main document and dropdown-related requests should be successful.

5. Pass criteria.
   - The dropdown opens cleanly with correct borders.
   - No extra empty border strip or wrapper is visible.
   - The panel content, focus styling, and layering are correct.
   - The result holds across desktop, tablet, and mobile.
   - ARIA snapshot and screenshot evidence agree, with DOM snapshot treated as the source of truth for hairline-border regressions.

If automating with Playwright CLI, use a named session, prefer `snapshot --aria` for assertions, and close the session after capture. For dynamic header content, mask unstable elements before taking screenshots so the border check is measuring the UI fix rather than unrelated motion.

