For a fixed page title, put `title` directly on the route. Angular’s router title handling updates the document title after navigation.

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    title: 'Dashboard',
  },
];
```

If titles need a shared suffix or must be built from the deepest route, provide a custom `TitleStrategy`:

```ts
import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  RouterStateSnapshot,
  TitleStrategy,
} from '@angular/router';

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly documentTitle = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(snapshot);
    this.documentTitle.setTitle(
      routeTitle ? `${routeTitle} | Acme` : 'Acme',
    );
  }
}
```

Register it with the router configuration:

```ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
```

Use route `title` metadata for the page-specific value and keep title formatting in the strategy. A resolver can provide data used by a custom strategy when a title must depend on fetched route data; access control and fetching themselves should remain in dedicated guards and resolvers.

