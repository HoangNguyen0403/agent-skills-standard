To verify a fix for a broken dropdown border in the header, treat it as a focused visual regression plus a small interaction check.

Start by defining the expected result clearly: the dropdown trigger and the opened menu should use the intended border color, width, radius, and alignment in the header, with no missing edges, double borders, clipping, or border jumps on hover, focus, and open states.

A solid verification approach:

1. Capture a stable baseline
   - Use a deterministic viewport such as desktop width where the bug was seen.
   - Load the page with consistent theme, zoom, and font settings.
   - Freeze animations and dynamic content if possible so the border is the only changing signal.

2. Compare the exact UI states that matter
   - Header at rest
   - Header with dropdown trigger hovered
   - Header with dropdown trigger focused
   - Header with dropdown opened
   - Header with an item hovered inside the menu

3. Check the border visually and structurally
   - Confirm the border is present on all sides.
   - Confirm there is no 1px gap between trigger and menu if they are supposed to look connected.
   - Confirm adjacent header elements are not overlapping or masking the border.
   - Confirm box-shadow is not being mistaken for the border or hiding it.
   - Confirm dark mode and light mode both render correctly if supported.

4. Test common responsive breakpoints
   - Desktop
   - Tablet
   - Mobile header/nav state if the same component is reused

5. Check likely root-cause classes of failure
   - Border color same as background
   - Parent container with `overflow: hidden` clipping rounded corners
   - Focus ring or outline covering the border
   - Transforms/subpixel alignment causing one edge to disappear
   - Different states using different border tokens
   - Z-index causing the menu edge to render under the header

Good pass criteria:

- The dropdown border matches design in all intended states.
- No unexpected visual diff appears around the header after stabilizing unrelated motion.
- The fix holds across supported breakpoints and themes.
- Keyboard focus still remains visible and accessible after the border fix.

If you want this to be robust in automation, use state-specific screenshots of the header region and keep the assertion narrow so unrelated page changes do not create noise.

