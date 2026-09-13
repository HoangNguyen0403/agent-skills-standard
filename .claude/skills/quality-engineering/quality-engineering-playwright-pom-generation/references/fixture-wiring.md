# Fixture Wiring

All page objects are exposed through one `pages` fixture so specs never construct page objects by hand and never touch raw `page`.

```ts
// tests/fixtures.ts
import { test as base } from '@playwright/test';
import { CheckoutPage } from './pages/checkout.page';
import { LoginPage } from './pages/login.page';

type Pages = {
  checkout: CheckoutPage;
  login: LoginPage;
};

export const test = base.extend<{ pages: Pages }>({
  pages: async ({ page }, use) => {
    await use({
      checkout: new CheckoutPage(page),
      login: new LoginPage(page),
    });
  },
});

export { expect } from '@playwright/test';
```

Rules:

- Adding a page object = one import + one property in `Pages` + one constructor call. Nothing else changes.
- The seed spec (`tests/seed.spec.ts`) imports `test` from `./fixtures` too, so auth/navigation prerequisites run through the same page objects.
- Do not put `beforeEach` auth here; that is the seed's job (`quality-engineering-test-plan-authoring` Seed section).
- When Playwright Test Agents are initialised (`specs/` + `tests/seed.spec.ts` exist), keep the fixture file name `tests/fixtures.ts` so the vendor generator finds it.
