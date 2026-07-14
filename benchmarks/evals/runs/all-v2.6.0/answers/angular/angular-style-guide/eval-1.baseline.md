Use lowercase kebab-case for Angular filenames, and make the filename describe the single main concept implemented by the file. Keep related files on the same basename and distinguish their roles with a standard suffix:

- `user-profile.component.ts`
- `user-profile.component.html`
- `user-profile.component.scss`
- `user-profile.component.spec.ts`
- `user-profile.service.ts`
- `highlight.directive.ts`
- `currency.pipe.ts`
- `auth.guard.ts`

Use PascalCase for exported Angular classes, such as `UserProfileComponent`, `UserProfileService`, `HighlightDirective`, and `CurrencyPipe`. Use camelCase for methods, properties, parameters, and local variables. Reserve uppercase snake case for genuine compile-time constants when that convention is useful; do not make ordinary configuration or fields look like constants.

Component selectors should have the application or library prefix and normally use a kebab-case element selector, for example `app-user-profile`. Attribute selectors should also use the prefix, for example `[appAutoFocus]`, so that they are unlikely to collide with native HTML or another library. Match the selector, class, and file names so a symbol can be found quickly.

Prefer complete, descriptive names over unexplained abbreviations. Keep singular/plural usage consistent with the concept, and use conventional suffixes such as `Component`, `Service`, `Directive`, `Pipe`, `Guard`, `Interceptor`, and `Resolver`. A test file should use the same basename with `.spec.ts`. The exact stylesheet extension or project prefix can vary by repository, but the naming scheme should be consistent and enforced by tooling where possible.

