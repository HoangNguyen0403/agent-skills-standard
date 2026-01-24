---
name: React Native Components
description: Modern component patterns using function components and composition.
metadata:
  labels: [react-native, components, hooks, patterns]
  triggers:
    files: ['**/*.tsx', '**/*.jsx']
    keywords:
      [component, props, children, composition, presentational, container]
---

# React Native Components

## **Priority: P0 (CRITICAL)**

Standards for building scalable, maintainable components.

## Implementation Guidelines

- **Function Components Only**: Use hooks. No class components.
- **Container/Presentational**: Separate logic (hooks, data fetching) from UI (JSX, styling).
- **Composition**: Use `children` prop. Prefer composition over prop drilling.
- **Props**: TypeScript interfaces. Destructure in params.
- **File Size**: Keep components < 250 lines. Split if larger.
- **One Component Per File**: Named exports for components.
- **Naming**: `PascalCase` for components. `use*` for hooks.
- **Imports**: Group - React → External → Internal → Styles.
- **Platform Components**: Use built-in (`View`, `Text`, `TouchableOpacity`). Avoid DOM (`div`, `span`).

## Code

```tsx
// Container: Logic + Data
function HomeScreen() {
  const { data, loading } = useFetchPosts();
  return <PostList posts={data} loading={loading} />;
}

// Presentational: UI Only
type Props = { posts: Post[]; loading: boolean };

function PostList({ posts, loading }: Props) {
  if (loading) return <ActivityIndicator />;
  return (
    <FlatList
      data={posts}
      renderItem={({ item }) => <PostCard post={item} />}
    />
  );
}
```

## Anti-Patterns

- **No Classes**: Use hooks instead.
- **No Nested Components**: Define at top level.
- **No Inline Styles**: Use `StyleSheet.create`.
- **No Index Keys**: Use stable IDs.
- **No Deep Nesting**: Max 3 levels.

## Reference & Examples

See [references/patterns.md](references/patterns.md) for HOCs, Render Props, Compound Components, and Slot patterns.

## Related Topics

react/component-patterns | react/hooks | styling
