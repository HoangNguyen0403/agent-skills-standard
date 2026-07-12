# Reusable React Native card

Design the card around a stable, domain-neutral contract rather than one feature’s data shape. Accept explicit props such as `title`, `subtitle`, `image`, `footer`, `onPress`, `disabled`, `accessibilityLabel`, and optionally render slots for leading/trailing/content. Keep data fetching and navigation out of the card.

```tsx
type CardProps = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  children?: React.ReactNode;
};

export function Card({title, subtitle, onPress, children}: CardProps) {
  const content = (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}
```

Use `Pressable` for interaction, expose accessibility semantics, support loading/disabled states, and keep styles based on shared tokens. Add variants sparingly; prefer composition for feature-specific content. Test rendering, press behavior, disabled behavior, and accessibility. Place it in a shared UI area only after its API is truly reusable.

