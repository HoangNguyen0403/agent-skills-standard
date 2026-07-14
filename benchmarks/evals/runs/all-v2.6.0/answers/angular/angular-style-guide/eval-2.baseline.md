Name Angular artifacts after the domain concept and their role, then keep the file name, class name, and selector aligned. For example:

```text
user-profile.component.ts  -> UserProfileComponent
user-profile.service.ts    -> UserProfileService
user-profile.component.html
user-profile.component.scss
user-profile.component.spec.ts
```

Use lowercase kebab-case for filenames: `user-profile.component.ts`, not `UserProfileComponent.ts` or `userProfileComponent.ts`. Use PascalCase for exported classes and append the role suffix: `UserProfileComponent`, `UserProfileService`, `SearchDirective`, and `DateFormatPipe`. Use camelCase for members and functions, such as `loadUserProfile()` and `isLoading`.

Component selectors should normally use the project prefix and a kebab-case element name, such as `app-user-profile`. A prefix prevents collisions with native elements and components from other libraries. Attribute directives should also be prefixed, for example `[appHighlight]`; the selector style may differ slightly from element selectors because it is an attribute name.

For services, use a noun that describes the responsibility rather than a vague name such as `HelperService` or `CommonService`: `UserService`, `OrderApiService`, or `SessionStorageService`. Keep a service’s `Service` suffix in its class and file name so its role is obvious. Use the analogous suffixes for guards, interceptors, resolvers, pipes, and directives. Co-locate the component’s template, styles, tests, and closely related helpers, and follow one naming convention consistently across the project.

