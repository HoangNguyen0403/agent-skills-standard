Use `ng generate` (or its `ng g` shorthand) and choose flags for the specific generator. The most useful flags are:

- `--dry-run`: preview the files and changes without writing them. Use this first when a generator or path is unfamiliar.
- `--skip-tests`: omit the generated spec file.
- `--flat`: place the generated file directly in the target directory instead of creating a new subdirectory.
- `--change-detection=OnPush`: generate a component using OnPush change detection.
- `--style=scss`: choose SCSS for generated component stylesheets.
- `--functional`: generate a functional guard or interceptor where that generator supports it.
- `--standalone`: generate a standalone pipe where supported.

Examples:

```bash
ng g c features/dashboard --dry-run
ng g c features/user-profile --change-detection=OnPush --style=scss --skip-tests
ng g s services/auth
ng g guard guards/auth --functional
ng g pipe pipes/truncate --standalone
```

Use the CLI generator rather than creating Angular files manually so project conventions and registrations are applied consistently.

