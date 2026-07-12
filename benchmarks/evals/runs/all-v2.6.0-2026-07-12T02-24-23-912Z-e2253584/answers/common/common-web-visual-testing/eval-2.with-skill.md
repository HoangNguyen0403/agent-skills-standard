Do not let the rotating clock participate in the visual comparison.

The fix is to stabilize or mask that dynamic region before capturing diffs:

1. Prefer masking for screenshot-based comparisons.
   - Mask the clock element in the screenshot command so the rest of the header can still be compared normally.
   - This is the safest default because it removes false regressions without changing the page’s real structure.

2. If masking is not available or not enough, freeze motion before capture.
   - Disable animations/transitions in the page before taking the snapshot/screenshot.
   - For a clock specifically, hide the live element or set its opacity to 0 during capture if it is not part of the behavior under test.

3. Keep assertions ARIA-first.
   - Use `snapshot --aria` as the primary verification artifact for structure and accessible state.
   - A rotating clock is exactly the kind of dynamic content that should not decide pass/fail for a visual regression unless the clock itself is what you are testing.

4. Preserve comparative-audit discipline.
   - Capture the same state before and after.
   - Mask the same clock region in both runs.
   - Compare only stable UI surfaces.

5. Pass criteria.
   - Visual diffs stop failing on clock movement alone.
   - Header layout, borders, spacing, and interactive states are still verifiable.
   - No unrelated dynamic content is left unmasked to create flaky diffs.

In Playwright CLI terms, this means taking a named session, using `snapshot --aria` for structural proof, and using `screenshot --mask <clock-element>` for the visual artifact. If the page uses CSS-driven motion, disabling animation before capture is also appropriate, but masking the clock is the cleanest fix because the skill explicitly treats timestamps and similar dynamic elements as mandatory masking targets.

