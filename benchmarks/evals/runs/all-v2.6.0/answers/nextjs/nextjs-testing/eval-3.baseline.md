Use an E2E runner such as Playwright and test the journey through the running application, with isolated test data or a payment sandbox:

```ts
test('customer can complete checkout', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: /checkout/i }).click();
  await page.getByLabel(/email/i).fill('buyer@example.com');
  await page.getByLabel(/card/i).fill(TEST_CARD_NUMBER);
  await page.getByRole('button', { name: /place order/i }).click();
  await expect(page.getByRole('heading', { name: /order confirmed/i })).toBeVisible();
});
```

Cover cart contents, authentication/guest behavior, validation, payment success/failure, retry, and duplicate-submit protection. Seed a known cart/order, use environment-provided test credentials/card numbers, and clean up or namespace data per worker. Prefer role/label locators and web-first assertions; avoid arbitrary sleeps. Run against a production-like build, capture traces/screenshots on failure, and keep third-party payment interactions in a sandbox or contract-mocked boundary rather than charging real cards.

