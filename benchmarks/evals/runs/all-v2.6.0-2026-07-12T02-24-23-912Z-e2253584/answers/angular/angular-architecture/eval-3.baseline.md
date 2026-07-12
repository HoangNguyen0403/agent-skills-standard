# Standalone components versus NgModules

For new Angular code, standalone components are usually the better default. A standalone component declares its own template dependencies in `imports`, can be lazy loaded directly, and avoids creating a module solely to group a few declarations. New applications can bootstrap with `bootstrapApplication` and define providers in `app.config.ts`.

For example:

```ts
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ProfileHeaderComponent, RouterLink],
  templateUrl: './profile-page.component.html',
})
export class ProfilePageComponent {}
```

Use NgModules when integrating an existing module-based application or library, when a third-party package still exposes module declarations, or when a team needs an incremental migration path. NgModules are not inherently wrong; they remain supported and are often the least risky choice for legacy areas. A module-based feature can coexist with standalone components while it is migrated.

The choice should be consistent within a new feature. With standalone code, import the components, directives, and pipes where they are used, and put application-wide providers in the application configuration. Use route-level providers for services whose lifetime should be limited to a feature. With NgModules, declarations belong to exactly one NgModule, and imported/exported modules control template visibility; providers should still be placed according to their intended scope rather than blindly in a shared module.

Do not convert an entire mature application just to follow a style preference. Migrate at useful boundaries: introduce standalone components for new screens, update routes to `loadComponent` where appropriate, and preserve module-based boundaries until their dependencies and tests are ready. In short, choose standalone by default for new code, and choose NgModule where compatibility or gradual migration provides real value.


