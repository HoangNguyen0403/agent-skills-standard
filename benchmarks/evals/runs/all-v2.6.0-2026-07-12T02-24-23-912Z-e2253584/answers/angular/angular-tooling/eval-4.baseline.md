# Update Angular CLI

Check the versions currently in use first:

```bash
ng version
npm outdated @angular/cli @angular/core
```

Update the CLI and Angular framework in the project together so their major versions stay aligned:

```bash
ng update @angular/cli@latest @angular/core@latest
```

Use the equivalent command for the project’s package manager, such as `pnpm update` or `yarn up`, where appropriate. `ng update` examines peer dependencies and runs Angular’s migration schematics; read its proposed changes and commit or otherwise checkpoint the work before running it.

The globally installed CLI is separate from the project-local CLI. If you use the global command, update it independently:

```bash
npm install --global @angular/cli@latest
```

For a controlled upgrade, choose a specific target major rather than `latest`, and upgrade one major at a time when the migration guide requires it:

```bash
ng update @angular/cli@<target-major> @angular/core@<target-major>
```

Afterward, install dependencies from the updated lockfile and run the project’s tests, linting, and production build. Review breaking changes and peer-dependency warnings instead of bypassing them with `--force` unless you have a tested, intentional compatibility plan.

