# Page Object Template

Generated for scenario `@AC-3` (checkout success). Replace `checkout` / `Checkout` with the screen name from the plan.

```ts
// tests/pages/checkout.page.ts
import type { Locator, Page } from '@playwright/test';

export class CheckoutPage {
  constructor(private readonly page: Page) {}

  // Locators: ladder order getByRole > getByLabel > getByTestId > attribute CSS
  get shippingForm(): Locator {
    return this.page.getByRole('form', { name: 'Shipping' });
  }
  get emailInput(): Locator {
    return this.page.getByLabel('Email');
  }
  get submitButton(): Locator {
    return this.page.getByTestId('checkout-submit-button');
  }
  get orderIdBanner(): Locator {
    return this.page.getByTestId('checkout-order-id-banner');
  }

  // Actions: one per plan step verb, no assertions
  async goto(): Promise<void> {
    await this.page.goto('/checkout');
  }
  async fillShipping(data: { email: string; address: string }): Promise<void> {
    await this.emailInput.fill(data.email);
    await this.page.getByLabel('Address').fill(data.address);
  }
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  // State getters: the spec asserts on these
  async orderId(): Promise<string> {
    return (await this.orderIdBanner.textContent()) ?? '';
  }
}
```

Spec usage (assertions live here):

```ts
// tests/checkout.spec.ts
import { test, expect } from './fixtures';

test('@AC-3 successful order shows order id', async ({ pages }) => {
  await pages.checkout.goto();
  await pages.checkout.fillShipping({ email: 'a@b.c', address: '1 Main St' });
  await pages.checkout.submit();
  await expect(pages.checkout.orderIdBanner).toBeVisible();
  expect(await pages.checkout.orderId()).toMatch(/^ORD-\d+$/);
});
```

Selector Gaps block to emit when an element has no stable locator:

```md
## Selector Gaps
- checkout screen: order id banner has no data-testid -> checkout-order-id-banner
```
