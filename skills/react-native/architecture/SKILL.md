---
name: React Native Architecture
description: Feature-first project structure and separation of concerns for scalable React Native apps.
metadata:
  labels: [react-native, architecture, structure, features]
  triggers:
    files: ['src/**/*.tsx', 'src/**/*.ts', 'app.json']
    keywords: [feature, module, directory structure, separation of concerns]
---

# React Native Architecture

## **Priority: P0 (CRITICAL)**

Feature-first organization for scalable mobile apps.

## Project Structure

```text
src/
├── features/          # Feature modules (Home, Auth, Profile)
│   └── home/
│       ├── screens/   # Screens for this feature
│       ├── components/ # Feature-specific components
│       ├── hooks/     # Feature-specific hooks
│       └── services/  # Feature-specific business logic
├── components/        # Shared components
├── navigation/        # Navigation configuration
├── services/          # Shared services (API, storage)
├── hooks/             # Shared custom hooks
├── utils/             # Utility functions
├── theme/             # Colors, typography, spacing
└── types/             # TypeScript types
```

## Implementation Guidelines

- **Feature-First**: Organize by feature/module, not by type.
- **Colocation**: Keep related files together (screens, components, hooks within feature).
- **Separation**: UI (screens/components) separate from logic (hooks/services).
- **Atomic Components**: Reusable components in `/components`. Feature-specific in feature folder.
- **Absolute Imports**: Configure `tsconfig.json` paths (`@/components`, `@/features`).
- **Single Responsibility**: Each file has one clear purpose.
- **Expo vs CLI**: Structure works for both. Expo uses `app.json`, CLI uses `index.js`.

## Anti-Patterns

- **No Type-Based Folders**: Avoid `/containers`, `/screens` at root. Use features.
- **No Logic in Screens**: Extract to hooks or services.
- **No Circular Deps**: Features should not import from each other directly.
- **No Deep Nesting**: Max 3 levels deep.

## Reference & Examples

See [references/folder-structure.md](references/folder-structure.md) for full directory tree, path mapping, and service layer patterns.

## Related Topics

common/system-design | components | navigation | react/hooks | react/component-patterns
