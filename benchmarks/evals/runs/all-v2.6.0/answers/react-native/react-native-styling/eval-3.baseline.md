# Platform-specific font families

Use platform-specific style files or `Platform.select` and ensure the font is bundled and registered correctly on each platform:

```tsx
const styles = StyleSheet.create({
  body: {
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'AvenirNextRegular',
      default: 'sans-serif',
    }),
  },
});
```

The exact family name may differ from the filename, especially on Android, so verify it with the font’s platform metadata. Add the font files to the native projects or configure the Expo font plugin, then rebuild; JavaScript reload alone does not install a native font. Define weights explicitly and use the correct family/weight combination rather than relying on synthetic bold. Provide a fallback, test release builds on both platforms, check dynamic type/font scaling and missing-glyph behavior, and keep typography tokens centralized.

