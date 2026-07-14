# NgModule versus standalone components

For new Angular code, use standalone components, pipes, and directives. They make each component's dependencies explicit and eliminate the need for an NgModule as a feature assembly layer. In Angular 20 and later, standalone is the default; writing `standalone: true` explicitly is still clear when supporting or documenting older Angular versions.

```ts
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, ProfileHeaderComponent],
  templateUrl: './profile.component.html',
})
export class ProfileComponent {
  readonly form = new FormGroup({
    displayName: new FormControl('', { nonNullable: true }),
  });
}
```

Configure providers in `app.config.ts` and routes in `app.routes.ts`. Lazy-load a new feature with `loadComponent` or `loadChildren`, rather than eagerly importing its page into the root application.

NgModules are still reasonable at legacy boundaries: an existing module-based area can continue to use them while it is migrated, and a third-party library may expose an NgModule API. That compatibility case should not drive the architecture of a new feature. Do not add a new NgModule merely to group standalone components, and do not use an NgModule to hide dependencies that could be declared directly in a component's `imports`.

Whichever style is being migrated, preserve the architectural boundaries: group code by feature, keep global singletons in `core/`, reusable UI and pure utilities in `shared/`, and ensure feature routes remain lazy-loaded. For standalone code, verify that each component, pipe, and directive is standalone and that its dependencies are listed directly.

