Create a `ResolveFn<T>` that injects the data service and reads the route parameter, then attach it under `resolve`. Angular waits for the resolver to complete before activating the component, so critical data is available when navigation finishes.

```ts
// hero.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Hero } from './hero';
import { HeroService } from './hero.service';

export const heroResolver: ResolveFn<Hero> = (route) => {
  const id = route.paramMap.get('id');
  if (!id) {
    throw new Error('The hero id route parameter is required');
  }

  return inject(HeroService).getHero(id);
};
```

Register it on a lazy route:

```ts
import { Routes } from '@angular/router';
import { heroResolver } from './hero.resolver';

export const routes: Routes = [
  {
    path: 'heroes/:id',
    loadComponent: () =>
      import('./hero.component').then((m) => m.HeroComponent),
    resolve: { hero: heroResolver },
    title: 'Hero',
  },
];
```

`getHero` may return a `Hero`, `Promise<Hero>`, or `Observable<Hero>`. With `withComponentInputBinding()` enabled, the resolved key is also available as a matching component input:

```ts
import { input } from '@angular/core';
import { Hero } from './hero';

export class HeroComponent {
  hero = input.required<Hero>();
}
```

Keep the fetch in the resolver, not in the route configuration or as an activation side effect. Add application-specific error handling (for example, mapping a missing hero to a not-found `UrlTree`) at the resolver boundary so failed navigation has an explicit outcome.

