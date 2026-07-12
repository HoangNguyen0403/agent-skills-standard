The right fix is to make the clock deterministic during visual tests. A rotating clock creates continuous pixel changes, so even a correct UI will fail screenshot comparison.

Best options, in order:

1. Disable or pause the animation in test mode
   - Add a test-only hook such as a query param, environment flag, or data attribute.
   - When visual tests run, stop the rotation animation entirely.
   - This is usually the cleanest fix because it preserves the real UI outside tests.

2. Freeze time or mock the component state
   - Render the clock at a fixed timestamp or fixed rotation angle during tests.
   - Useful when the clock hand position is derived from current time rather than pure CSS animation.

3. Hide or mask only that dynamic area in the screenshot
   - Use this if you cannot safely change runtime behavior.
   - This is weaker than freezing the component because it reduces coverage of the header.

4. Reduce motion globally in the test environment
   - Force animations and transitions to none.
   - Helpful as a general hardening step, though it may not be enough if the clock uses live time-based rendering logic.

What a good implementation looks like:

- Production behavior stays unchanged for real users.
- Visual test runs always render the same clock output.
- The stabilization mechanism is explicit and easy to understand.
- Other header elements remain covered by the screenshot assertion.

What to verify after the fix:

- Two consecutive screenshot runs produce identical output.
- The clock no longer causes flaky diffs.
- The header layout does not shift when animation is disabled.
- If the clock is interactive or meaningful, add a separate functional test for its real behavior outside visual diffing.

In short: do not loosen the screenshot threshold to accommodate motion. Make the component stable in the visual test environment instead.

