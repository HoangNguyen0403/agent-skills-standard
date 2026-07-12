Enable component input binding when configuring the router. Angular can then map route parameters, query parameters, and resolved data to matching component inputs.

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes, withComponentInputBinding())],
};
```

For a route such as `heroes/:id`, declare an input named `id`:

```ts
import { Component, input } from '@angular/core';

@Component({
  standalone: true,
  template: '<p>Hero: {{ id() }}</p>',
})
export class HeroComponent {
  id = input.required<string>();
  search = input<string>(); // receives ?search=...
}
```

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'heroes/:id',
    loadComponent: () =>
      import('./hero.component').then((m) => m.HeroComponent),
  },
];
```

The names must match the route/query keys. If a value comes from a resolver, expose an input with the resolver key as well—for example, `hero = input.required<Hero>()` for `resolve: { hero: heroResolver }`. Use `input.required` for values the route contract must always supply; use optional `input<T>()` when the parameter or query value may be absent.

