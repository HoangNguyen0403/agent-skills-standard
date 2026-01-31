# React Native Design System Usage

## 1. Token Structure

Define tokens in `theme/`:

```typescript
// theme/colors.ts
export const colors = {
  primary: '#2196F3',
  background: '#FFFFFF',
  text: '#000000',
  error: '#B00020',
} as const;

// theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// theme/typography.ts
export const typography = {
  h1: { fontSize: 32, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
} as const;
```

## 2. Usage Examples

### Using StyleSheet

```typescript
import { StyleSheet, View, Text } from 'react-native';
import { colors, spacing, typography } from './theme';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
  },
});
```

### Using Styled Components

```typescript
import styled from 'styled-components/native';

const Container = styled.View`
  background-color: ${(p) => p.theme.colors.background};
  padding: ${(p) => p.theme.spacing.md}px;
`;
```
