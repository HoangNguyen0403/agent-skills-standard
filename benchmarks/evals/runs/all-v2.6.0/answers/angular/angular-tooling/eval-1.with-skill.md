Use the Angular CLI from the Angular workspace root:

```bash
ng generate component features/user-profile
```

The shorthand is equivalent:

```bash
ng g c features/user-profile
```

For an unfamiliar generator, preview its output first without writing files:

```bash
ng g c features/user-profile --dry-run
```

Useful options include `--change-detection=OnPush` to generate the component with OnPush change detection and `--skip-tests` to omit its spec file. Use `ng generate` rather than creating the component files manually so the CLI applies the project’s conventions and configuration.

