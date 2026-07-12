Represent the list item gap as a spacing token rather than a hardcoded magic number wherever possible. In a Flutter design system, 8 pixels usually maps cleanly to a small spacing value such as `space8`, `spacingXs`, or a similar token from the scale. That keeps vertical rhythm consistent across lists, cards, and form groupings.

At implementation level, the 8-pixel separation can be applied with a `SizedBox(height: 8)` between vertically stacked items, a list separator in `ListView.separated`, or item padding that preserves the same visual gap. The important design-system behavior is that the spacing is standardized, reusable, and named, so “8 pixels between list items” becomes part of the layout scale instead of a one-off adjustment.

