---
name: react-native-architecture
description: Structure React Native projects with feature-first organization and separation of concerns. Use when structuring a React Native project or applying clean architecture patterns.
metadata:
  triggers:
    files:
    - 'src/**/*.tsx'
    - 'src/**/*.ts'
    - 'app.json'
    - 'StyleSheet.create'
    keywords:
    - feature
    - module
    - directory structure
    - separation of concerns
    - Expo
    - React Navigation
    - react-native
    - mobile architecture
---
# React Native Architecture

## **Priority: P0 (CRITICAL)**


## Organize by Feature

- **Feature-First**: Organize by feature/module, not by type.
- **Colocation**: Keep related files together (screens, components, hooks within feature).
- **Separation**: UI (screens/components) separate from logic (hooks/services).

See [folder structure reference](references/folder-structure.md) for full directory tree and path alias configuration.

- **Atomic Components**: Reusable components in `/components`. Feature-specific in feature folder.
- **Absolute Imports**: Configure tsconfig.json paths for clean imports.
- **Single Responsibility**: Each file one clear purpose.
- **Expo vs CLI**: Structure works for both. Expo uses `app.json`, CLI uses `index.js`.

## Anti-Patterns

- **No Type-Based Folders**: Avoid `/containers`, `/screens` at root. Use features.
- **No Logic in Screens**: Extract to hooks or services.
- **No Circular Deps**: Features should not import from each other directly.
- **No Deep Nesting**: Max 3 levels deep.

## Navigation Strategy

- **Expo Router**: Use for new projects, web-parity, and file-based routing.
- **React Navigation**: Use for complex deep-linking, legacy apps, or high-customization needs.

## Verification Checklist (Mandatory)

- [ ] **Feature-First**: file inside feature directory?
- [ ] **Colocation**: hooks/services colocated with screens?
- [ ] **Logic-Free Screens**: there any business logic in screen component?
- [ ] **Navigation Choice**: project use navigation strategy defined above?

## References

See [references/folder-structure.md](references/folder-structure.md) for full directory tree, path alias config, and service layer patterns.