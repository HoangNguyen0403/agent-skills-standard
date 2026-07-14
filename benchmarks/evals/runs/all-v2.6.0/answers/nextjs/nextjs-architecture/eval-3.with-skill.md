# Cross-slice imports

Direct mutual imports violate the FSD rule that slices in the same layer cannot import one another. Break the cycle by moving shared domain data or behavior into a lower layer, usually `entities` or `shared`, and expose it through that slice’s public API. If the behavior is a higher-level user interaction, compose both features in a widget instead. Keep imports through each slice’s top-level `index.ts`, and verify that dependencies only point downward through the layer hierarchy.

