First ask the Angular CLI which updates are available:

```bash
ng update
```

Then apply the Angular framework and CLI update through the official migration path:

```bash
ng update @angular/core @angular/cli
```

This runs Angular’s official migrations/codemods along with the package update. Review the proposed package and migration changes, then resolve any peer-dependency conflicts normally. Do not use `ng update --force`; fix the compatibility conflict instead. Commit or otherwise save the current working state before updating so the migration can be reviewed and safely reverted if needed.

