Create providers for the cross-cutting state and mount them above the navigator, for example ThemeProvider and AuthProvider. Expose typed hooks such as useTheme and useAuth; each hook should throw a useful error if used outside its provider. Consumers then read or update state without passing it through every screen.

Keep small UI state local, use Context for theme and auth, and use Zustand or Redux Toolkit if the shared client state becomes complex. For API data, use a query cache rather than duplicating responses in Context or useState.



