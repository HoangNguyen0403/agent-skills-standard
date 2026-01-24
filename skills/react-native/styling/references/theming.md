# React Native Styling Reference

Advanced theming, responsive design, and layout patterns.

## Design Tokens

```tsx
// src/theme/tokens.ts
export const PALETTE = {
  primary: '#007AFF',
  success: '#4CD964',
  error: '#FF3B30',
  black: '#000000',
  white: '#FFFFFF',
  gray: { 100: '#F2F2F7', 500: '#8E8E93', 900: '#1C1C1E' },
};

export const SPACING = { xs: 4, s: 8, m: 16, l: 24, xl: 32 };

export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
};
```

## Dynamic Theming with Context

Complete implementation for light/dark mode.

```tsx
// src/theme/ThemeProvider.tsx
const ThemeContext = createContext({
  isDark: false,
  theme: lightTheme,
  toggle: () => {}
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState(systemScheme || 'light');

  const theme = mode === 'dark' ? darkTheme : lightTheme;
  const toggle = () => setMode(m => m === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ isDark: mode === 'dark', theme, toggle }}>
      {children}
    </AccordionContext.Provider>
  );
}
```

## Responsive Layout Utilities

```tsx
import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Scale based on design width (e.g. 375px)
const scale = SCREEN_WIDTH / 375;

export function normalize(size: number) {
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

// Usage in StyleSheet
const styles = StyleSheet.create({
  card: {
    width: normalize(300),
    padding: normalize(16),
  },
});
```

## Shadow Helper

```tsx
export const shadow = (elevation = 5) => ({
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: 0.2 + elevation / 100,
      shadowRadius: elevation,
    },
    android: {
      elevation,
    },
  }),
});
```
