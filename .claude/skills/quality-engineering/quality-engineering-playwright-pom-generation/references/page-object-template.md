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
  get addressInput(): Locator {
    return this.page.getByLabel('Address');
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
    await this.addressInput.fill(data.address);
  }
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  // Scalar snapshot: read point-in-time value for extraction/logging, NOT for eventual assertions
  async orderIdSnapshot(): Promise<string> {
    return (await this.orderIdBanner.textContent())?.trim() ?? '';
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

  // 1. Live locator assertions: automatically retry until timeout against delayed text or DOM updates
  await expect(pages.checkout.orderIdBanner).toBeVisible();
  await expect(pages.checkout.orderIdBanner).toHaveText(/^ORD-\d+$/);

  // 2. Legitimate scalar snapshot: use scalar read for downstream workflows, logging, or API cleanup (never as a duplicate dynamic-state assertion oracle)
  const orderId = await pages.checkout.orderIdSnapshot();
  console.info(`Order placed successfully: ${orderId}`);
});
```
## Live Locator Assertions vs Sampled Scalar State

### The Race Condition in Sampled State (Anti-Pattern)

```ts
// ❌ ANTI-PATTERN: racy non-retrying assertion
await expect(pages.checkout.orderIdBanner).toBeVisible();
expect(await pages.checkout.orderId()).toMatch(/^ORD-\d+$/);
```

When `orderIdBanner` becomes visible before its text loads (e.g. initial placeholder, spinner, or async response), `textContent()` reads the scalar string once at that instant. The generic assertion `expect(...).toMatch(...)` evaluates immediately without polling or retrying, causing intermittent test flakiness.

### The Retrying Web Assertion (Recommended)

```ts
// ✅ RECOMMENDED: auto-retrying web assertion
await expect(pages.checkout.orderIdBanner).toBeVisible();
await expect(pages.checkout.orderIdBanner).toHaveText(/^ORD-\d+$/);
```

`expect(locator).toHaveText()` continuously re-queries the DOM element until the locator satisfies the pattern or reaches the test timeout, resiliently tolerating delayed text updates and DOM replacements.

### Legitimate Scalar Snapshot Extraction

Scalar methods (`textContent()`, `inputValue()`) are permitted when extracting already-settled data for external consumers (e.g. passing an order ID to an API teardown helper, writing a diagnostic log, or passing state to another system). Distinguish this read from verification assertions: assertions on eventual state must always target the locator.


Selector Gaps block to emit when an element has no stable locator:

```md
## Selector Gaps
- checkout screen: order id banner has no data-testid -> checkout-order-id-banner
```
