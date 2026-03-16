# Folder Structure

```text
src/
├── app/
│   ├── app.config.ts         # Application Config (Providers)
│   ├── app.routes.ts         # Root Routes
│   ├── app.component.ts      # Root Component
│   ├── core/                 # Singleton services, interceptors, guards
│   │   ├── auth/
│   │   └── interceptors/
│   ├── shared/               # Reusable presentational components
│   │   ├── ui/
│   │   └── utils/
│   └── features/             # Business features
│       ├── dashboard/
│       │   ├── dashboard.component.ts
│       │   ├── dashboard.routes.ts
│       │   └── components/   # Feature-specific dumb components
│       └── profile/
└── assets/
```
