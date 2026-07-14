Use platform-specific font configuration rather than branching through every component. For a small difference, use Platform.select in a shared StyleSheet; when the style or asset diverges substantially, use .ios and .android files or style modules.

Bundle and link the font files correctly for both platforms, register the exact family names, and provide a fallback. Keep font sizes and weights in typography tokens, then test the real font on iOS and Android because family names and available weights can differ.



