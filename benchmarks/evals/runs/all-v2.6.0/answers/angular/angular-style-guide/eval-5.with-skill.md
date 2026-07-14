Use `index.ts` barrels only as public API boundaries. A feature-level barrel can explicitly re-export the components, services, or types that consumers are allowed to use:

```ts
// features/heroes/index.ts
export { HeroListComponent } from './hero-list/hero-list.component';
export type { Hero } from './hero.model';
```

Consumers can then import from the feature's public entry point. Within that same feature, import directly from the defining file instead of importing through its own barrel, for example `./hero.service` rather than `../index`. Avoid broad or deeply nested barrels and accidental re-exports: incorrect barrel placement can interfere with tree-shaking. Keep the public exports intentional and limited to the feature's supported API.

