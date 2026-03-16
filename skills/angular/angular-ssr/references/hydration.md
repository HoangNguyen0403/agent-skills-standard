# Hydration

## Enable Hydration

In `app.config.ts`:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [provideClientHydration()],
};
```

## Browser-Only Code

Do not use `isPlatformBrowser`. Use Lifecycle hooks.

```typescript
@Component({...})
export class ChartComponent {
  constructor() {
    afterNextRender(() => {
      // Safe to use window/document here
      // This only runs on the browser
      new Chart(document.getElementById('chart'));
    });
  }
}
```
