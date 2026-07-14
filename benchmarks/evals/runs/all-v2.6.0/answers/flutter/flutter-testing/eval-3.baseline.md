Assuming Playwright and stable `data-testid` selectors:

```ts
import { test, expect } from '@playwright/test';

test('displays the first order after login', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill(process.env.TEST_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Log in' }).click();

  await page.getByRole('tab', { name: 'Orders' }).click();

  await expect(page.getByTestId('order-card').first()).toBeVisible();
});
```

Assumptions: the application uses `/login`, accessible `Email`/`Password` fields, a `Log in` button, an `Orders` tab, and `order-card` test IDs.
