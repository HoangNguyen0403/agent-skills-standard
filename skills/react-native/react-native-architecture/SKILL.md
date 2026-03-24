---
name: react-native-architecture
description: "Structure React Native projects with feature-first organization and separation of concerns. Use when structuring a React Native project or applying clean architecture patterns. (triggers: src/**/*.tsx, src/**/*.ts, app.json, feature, module, directory structure, separation of concerns, Expo, React Navigation, StyleSheet.create, react-native, mobile architecture)"
---

# React Native Architecture

## **Priority: P0 (CRITICAL)**

Feature-first organization for scalable mobile apps.

## Organize by Feature

- **Feature-First**: Organize by feature/module, not by type.
- **Colocation**: Keep related files together (screens, components, hooks within feature).
- **Separation**: UI (screens/components) separate from logic (hooks/services).

```text
src/
├── features/
│   ├── auth/
│   │   ├── screens/LoginScreen.tsx
│   │   ├── hooks/useAuth.ts
│   │   └── services/authApi.ts
│   └── orders/
│       ├── screens/OrderListScreen.tsx
│       ├── hooks/useOrders.ts
│       └── components/OrderCard.tsx
├── components/          # Shared reusable components
├── navigation/
└── services/            # Shared API/utilities
```

- **Atomic Components**: Reusable components in `/components`. Feature-specific in feature folder.
- **Absolute Imports**: Configure tsconfig.json paths for clean imports.
- **Single Responsibility**: Each file has one clear purpose.
- **Expo vs CLI**: Structure works for both. Expo uses `app.json`, CLI uses `index.js`.

```json
// tsconfig.json - path aliases
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/features/*": ["src/features/*"],
      "@/components/*": ["src/components/*"],
      "@/services/*": ["src/services/*"],
      "@/navigation/*": ["src/navigation/*"]
    }
  }
}
```

## Anti-Patterns

- **No Type-Based Folders**: Avoid `/containers`, `/screens` at root. Use features.
- **No Logic in Screens**: Extract to hooks or services.
- **No Circular Deps**: Features should not import from each other directly.
- **No Deep Nesting**: Max 3 levels deep.

## Navigation Strategy

- **Expo Router**: Use for new projects, web-parity, and file-based routing.
- **React Navigation**: Use for complex deep-linking, legacy apps, or high-customization needs.

## Verification Checklist (Mandatory)

- [ ] **Feature-First**: Is the file inside a feature directory?
- [ ] **Colocation**: Are hooks/services colocated with screens?
- [ ] **Logic-Free Screens**: Is there any business logic in the screen component?
- [ ] **Navigation Choice**: Does the project use the navigation strategy defined above?

## References

See [references/folder-structure.md](references/folder-structure.md) for full directory tree, path alias config, and service layer patterns.
