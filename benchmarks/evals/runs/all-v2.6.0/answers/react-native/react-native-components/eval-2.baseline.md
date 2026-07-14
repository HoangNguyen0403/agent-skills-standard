# Cleaning up a mixed screen component

Separate the screen into three layers:

- A feature API module for HTTP requests, serialization, and error mapping.
- A custom hook or server-state library for loading, caching, retries, mutations, and query invalidation.
- Presentational components for JSX and visual state.

The screen should mostly connect route parameters and callbacks to a view:

```tsx
function ProfileScreen() {
  const {userId} = useRoute<RouteProp<Routes, 'Profile'>>().params;
  const profile = useProfile(userId);
  return <ProfileView {...profile} onRetry={profile.refetch} />;
}
```

Keep transient UI state—selected tab, open dialog, draft text—near the component that owns it. Keep shared client state in a store only when multiple parts of the app need it. Extract pure transformations and business rules so they can be tested without React Native. Make the view handle loading, empty, error, and success states explicitly, then run unit/component tests and type checks while refactoring.

