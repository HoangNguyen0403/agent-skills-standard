# Setting up Vitest for Angular testing

For Angular v20 and later, use the Angular CLI unit-test builder with Vitest. New CLI projects are already configured this way. The CLI owns the Angular/Vitest integration, so a normal project does not need a second Vite plugin configuration or a second `TestBed` initialization.

In `angular.json`, the project test target should use `@angular/build:unit-test`:

```json
{
  "projects": {
    "my-app": {
      "architect": {
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "tsConfig": "tsconfig.spec.json",
            "buildTarget": "my-app:build"
          }
        }
      }
    }
  }
}
```

`tsConfig` and `buildTarget` can use the project's existing names; the builder supplies defaults when they are omitted. If migrating from Karma, review and move any test-specific assets, styles, or polyfills into the appropriate build configuration because the unit-test builder does not accept all of the old Karma builder options. Remove the old Karma configuration and packages only after checking for project-specific behavior.

Run the tests through the Angular CLI:

```bash
ng test                         # watch mode locally
ng test --no-watch --no-progress # single-run CI-style execution
ng test --coverage              # coverage report
```

The usual `TestBed`, `ComponentFixture`, harness, and Angular testing APIs remain the same. In a Vitest spec, use Vitest assertions and spies consistently—for example, import `vi` from `vitest` when globals are disabled—rather than mixing Jasmine spies and matchers into a Vitest suite.

For global test setup, use the builder's `setupFiles` option. For example:

```json
{
  "test": {
    "builder": "@angular/build:unit-test",
    "options": {
      "setupFiles": ["src/test-setup.ts"]
    }
  }
}
```

Use a custom `runnerConfig` only for advanced Vitest settings; the Angular CLI still controls the Angular test project and included spec files. If existing tests depend on `fakeAsync`, `flush`, or `waitForAsync`, add `zone.js/plugins/vitest-patch` to the test target's polyfills as a migration aid. Prefer native `async`/`await` and Vitest fake timers for new tests where possible.

If the project is intentionally managed by a standalone Vite pipeline rather than Angular CLI, install compatible versions of `vitest`, `jsdom`, and the chosen Angular Vite integration, configure the `jsdom` environment and spec include pattern there, and initialize Angular's test environment exactly once. Do not combine that separate Vite bootstrap with the CLI builder for the same specs. Match all plugin and compiler peer versions to the Angular version in `package.json`.

