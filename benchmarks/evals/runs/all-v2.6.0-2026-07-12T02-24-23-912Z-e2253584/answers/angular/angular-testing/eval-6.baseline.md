# Setting up Vitest for Angular testing

Use one test-runner integration consistently. For an Angular CLI application, prefer the CLI's unit-test builder when the project version supports it; it wires Angular compilation and the browser-like test environment for you. Configure the `test` target in `angular.json` with the Angular build unit-test builder (commonly `@angular/build:unit-test`) and the project's spec TypeScript configuration, then run:

```bash
ng test
ng test --watch=false
```

The exact migration command and `angular.json` options depend on the Angular CLI version. Let that CLI version generate or migrate the test target rather than copying a Karma configuration into a Vitest project. With this builder, do not also run a separate Vite config for the same specs, and do not initialize `TestBed` a second time if the builder already does so.

For a project intentionally managed by Vite, a minimal setup is:

```bash
npm install --save-dev vitest jsdom @analogjs/vite-plugin-angular
npm install --save-dev @vitest/coverage-v8
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html'],
    },
  },
});
```

If the Vite integration does not initialize Angular's test environment, initialize it once in `src/test-setup.ts`:

```ts
import '@angular/compiler';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
);
```

Do not include that initialization twice. Some Angular/Vite integrations provide their own setup file; use that setup instead of the manual snippet. If `globals` is false, import `describe`, `it`, and `expect` from `vitest` in every spec. If `globals` is true, add `vitest/globals` to the `types` list in the spec tsconfig if TypeScript cannot resolve those names.

Useful scripts are:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

Run `npm run test:run` for CI and `npm run test:coverage` when coverage is required. Angular component tests need `jsdom` because they render DOM. Keep Angular's `TestBed` APIs in the tests, but use Vitest's assertions, spies (`vi.fn()`/`vi.spyOn()`), mocks, and fake timers consistently; do not mix Jasmine matchers or a second runner configuration. Match the plugin and builder versions to the Angular version in `package.json`, because Angular compiler and Vite plugin peer dependencies must agree.


