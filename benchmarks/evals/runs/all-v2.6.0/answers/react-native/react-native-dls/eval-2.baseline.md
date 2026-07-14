# Light/dark design system

Define themes with the same semantic token keys but different values. For example, both themes provide `background`, `surface`, `textPrimary`, `textMuted`, `border`, and status colors. Components consume `theme.colors.textPrimary`, never choose light/dark colors themselves.

Put a theme provider near the app root and expose a hook. The provider can use the device preference via `Appearance`/`useColorScheme`, or a persisted user preference with an explicit `system | light | dark` setting. On a change, update the provider value so all token-based components rerender. Persist only the preference, not a derived theme, and handle startup without a flash where practical.

Keep contrast and semantic meaning valid in both themes, test screenshots and accessibility contrast in each mode, and ensure native surfaces such as status/navigation bars, dialogs, and images are updated too. If using a UI library, centralize customization in its theme mechanism rather than mixing two token systems.

