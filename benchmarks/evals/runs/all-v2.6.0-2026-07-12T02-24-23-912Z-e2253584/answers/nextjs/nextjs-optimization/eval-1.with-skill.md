Use `next/image` for the hero and reserve its layout space with explicit dimensions or `fill` inside a positioned, sized container. Mark the above-the-fold hero as the priority/LCP image, serve an appropriately sized responsive source, and provide an accurate `sizes` value. Measure LCP and CLS with DevTools or Speed Insights; do not use a bare `<img>` without dimensions.

