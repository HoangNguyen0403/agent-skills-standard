Use descriptive `kebab-case` filenames with a type suffix:

- Components: `hero-list.component.ts`
- Services: `auth.service.ts`
- Directives: `highlight.directive.ts`
- Pipes: `truncate.pipe.ts`
- Guards: `auth.guard.ts`
- Interceptors: `auth.interceptor.ts`
- Routes: `app.routes.ts`

The suffix makes a file's purpose immediately identifiable and supports the LIFT goal of locating code quickly. Keep one component or service per file, keep the project structure as flat as practical, and keep files below 400 lines. For example, `hero-list.component.ts` should contain the `HeroListComponent`, not several unrelated components.

