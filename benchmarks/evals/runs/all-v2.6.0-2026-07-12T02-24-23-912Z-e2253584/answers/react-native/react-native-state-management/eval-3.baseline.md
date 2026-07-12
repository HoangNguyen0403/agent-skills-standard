# Sharing theme and auth state

Use providers/contexts for cross-cutting concerns such as theme and authentication, with a provider near the root of the app. Expose a small typed hook (`useTheme`, `useAuth`) rather than passing values through every screen. The auth provider can own session restoration, sign-in/out actions, and an explicit `loading | authenticated | unauthenticated` state; secure tokens should remain in platform secure storage.

For larger or frequently changing state, use a typed client store with selectors, or split contexts so a theme update does not rerender unrelated auth consumers. Keep server data in a query cache rather than duplicating it in auth context. Put navigation guards at the root based on auth state, and make bootstrap/loading and logout transitions explicit. Test rehydration, expired sessions, sign-out cleanup, theme changes, and deep links arriving before providers are ready. Avoid putting secrets or mutable implementation details in a broad context value.

