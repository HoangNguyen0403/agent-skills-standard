# TypeScript Best Practices Reference

Project structure and advanced patterns.

## References

- [**Project Structure**](project-structure.md) - Scalable directory organization.
- [**Configuration**](configuration.md) - TSConfig best practices.

## Project Structure

```
src/
├── domain/           # Business logic (entities, value objects)
│   ├── user/
│   │   ├── user.entity.ts
│   │   └── user.repository.interface.ts
├── application/      # Use cases
│   └── user/
│       └── create-user.usecase.ts
├── infrastructure/   # External concerns
│   ├── database/
│   └── http/
├── presentation/     # Controllers, DTOs
│   └── user/
│       ├── user.controller.ts
│       └── user.dto.ts
└── shared/          # Shared utilities
    ├── types/
    └── utils/
```

## TSConfig Best Practices

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## Barrel Exports (Use Sparingly)

```typescript
// index.ts - Barrel file
export * from './user.service';
export * from './user.repository';
export type { UserDTO } from './user.dto';
```

Note: Avoid deep barrel exports as they can impact build performance.
