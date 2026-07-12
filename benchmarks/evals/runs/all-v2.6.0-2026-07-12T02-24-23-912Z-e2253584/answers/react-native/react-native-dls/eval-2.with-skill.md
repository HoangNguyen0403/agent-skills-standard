Define semantic tokens for colors, spacing, and typography rather than using raw values in components. Provide light and dark token maps with the same interface, select the active theme using React Context and useColorScheme, and expose a typed useTheme hook.

Components should consume theme.colors, theme.spacing, and theme.typography through StyleSheet-compatible style factories. This keeps mode switching centralized, avoids hardcoded values, and lets the design system evolve without editing every screen.



