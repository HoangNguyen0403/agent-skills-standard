# nextjs-architecture Implementation Examples

## Inline Examples

```
App (app/) -> Widgets -> Features -> Entities -> Shared
```

```typescript
// app/dashboard/page.tsx — thin page, imports only widgets/features
import { DashboardWidget } from '@/widgets/dashboard';
export default function DashboardPage() {
  return <DashboardWidget />;
}
```
