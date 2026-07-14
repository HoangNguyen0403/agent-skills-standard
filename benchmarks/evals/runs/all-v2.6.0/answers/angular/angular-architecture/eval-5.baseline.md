# Configuring lazy loading with `loadComponent`

`loadComponent` lazy loads one standalone component at a route boundary. Define it in the route configuration with a dynamic import and return the component class:

```ts
// app.routes.ts
export const routes: Routes = [
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/settings-page.component')
        .then(m => m.SettingsPageComponent),
  },
];
```

The target must be standalone:

```ts
@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './settings-page.component.html',
})
export class SettingsPageComponent {}
```

Put the component's template dependencies in its `imports` array. Do not import the page eagerly from the root component or another eagerly loaded file, because that can pull it into the initial bundle and undermine the lazy boundary. The dynamic import path and exported class name must match the actual file.

Use `loadComponent` for a single standalone route component. If a feature has several related routes, lazy load the route collection with `loadChildren`, and use `loadComponent` for the individual pages inside that collection:

```ts
{
  path: 'admin',
  loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
}
```

Guards, resolvers, route metadata, and feature-scoped providers can be configured on the same route. For example, put a store in the route's `providers` array when it should be shared by that route tree but not be a global singleton. Use a suitable preloading strategy only after measuring the navigation and bundle trade-offs; lazy loading improves the initial bundle but adds a request on first navigation. Confirm the result with a production build or bundle analysis and test direct navigation, guards, refreshes, and unknown routes.


