# Responsive React Native layouts

Build layouts with flexbox, percentages, `flex`, `aspectRatio`, and content-driven sizing instead of fixed screen dimensions. Use `useWindowDimensions` for values that genuinely depend on available width/height and recompute when orientation or split-screen size changes. Add safe-area insets with `react-native-safe-area-context`.

Use `ScrollView` for content that may exceed the viewport and virtualized lists for long collections. Avoid hardcoded heights that clip dynamic text, account for font scaling, and use `numberOfLines`/ellipsis only when truncation is intentional. Prefer `maxWidth` and spacing constraints over assuming a single device width. Test small phones, large phones/tablets, landscape, notches, RTL if supported, keyboard appearance, and large accessibility text. Centralize breakpoints/tokens and keep layout components composable; do not use device model checks as a substitute for measuring available space.

