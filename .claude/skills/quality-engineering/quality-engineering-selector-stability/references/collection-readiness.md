# Collection Readiness and Dynamic Lists

## Overview

Dynamic collections (search results, feeds, notifications, e-commerce cart lines) render and change asynchronously. When writing web assertions or interacting with collections in Playwright, test authors frequently introduce race conditions by mistaking point-in-time DOM states or simple element counts for stable, complete data.

Follow the guidance below to avoid false-green passes (e.g. iterating over an empty list) or flaky failures caused by dynamic re-rendering.

---

## 1. Retrying Assertions vs. Immediate Enumeration

### Rule
Prefer Playwright's retrying web-first locator assertions (`toHaveCount`, `toHaveText`) over immediate scalar extraction or immediate loop iterations. Do not materialize a collection just to assert its contents.

- **Retrying assertions (`expect(locator)...`)**: Automatically re-query the DOM and retry until the condition passes or the test timeout expires. They handle dynamic DOM updates, element attachments, and text population gracefully.
- **Immediate enumeration (`await locator.all()`)**: Immediately evaluates the locator against the current DOM and returns an array of live positional `Locator` instances (equivalent to `.nth(0)`, `.nth(1)`, etc.). The count/membership is sampled at invocation time and **does not wait** for asynchronous items to render or settle. While each returned `Locator` remains live and re-resolves upon subsequent action, the array itself captures only the elements present when `all()` was called. If called while items are still loading, `locator.all()` returns an empty array `[]` or a partial list, causing loops to silently terminate or skip elements.

### Anti-Pattern: False-Green Empty Loop
```ts
// Flaky / False-Green: If items load asynchronously, locator.all() resolves to [] immediately.
// The for-loop never executes, skipping all checks and passing the test falsely!
const items = await pages.cart.lineItems.all();
for (const item of items) {
  await expect(item).toBeVisible();
}
```

### Correct Pattern: Contract Completion, Exact Identities, and Stable Action Target
Positional enumeration is safe only when the application declares that the finite list's membership and order stay fixed for the enumeration window. Assertions observe content; they cannot supply that guarantee.

Only iterate when iteration is strictly required by the scenario. Before enumerating:
1. Assert declared completion of the finite list (e.g. loading spinner hidden or feed container ready).
2. Assert the exact expected identities and count using retrying assertions. This observes the content that currently matches; it does **not** freeze the list, and a later re-render, merge, or re-sort can still change membership or order between the assertion and the enumeration.
3. Confirm the application contract that makes positional enumeration valid: finite membership and stable order for the enumeration window. Without that declared contract, do not enumerate positionally; act by stable semantic ID/key through page object methods.
4. For actions that mutate the collection (such as deleting items), never rely on stale positional indices from `.all()`; target elements by their stable semantic ID/key via the page object action methods.

```ts
// 1. Establish declared finite completion via application contract
await expect(pages.cart.loadingSpinner).toBeHidden();

// 2. Observe current matching identities and order. This is an observation, not a freeze:
//    it does not stop a later update from changing membership or order.
await expect(pages.cart.lineItemNames).toHaveText([
  'item-sku-1042',
  'item-sku-2084',
  'item-sku-3099',
]);

// 3. Enumerate only under a declared contract that keeps membership and order stable for this window
//    (e.g. a terminal cart snapshot with no further updates). No such contract: skip positional enumeration.
const items = await pages.cart.lineItems.all();
for (const item of items) {
  // Read-only inspection of elements that are still positionally valid for this window
  await expect(item).toBeVisible();
}

// 4. For mutations (e.g. deleting an item), use stable semantic IDs through POM actions, NOT index from all():
await pages.cart.removeLineItem('item-sku-1042');
```

---

## 2. Why Count Alone Does Not Guarantee Stability

A list element count matching `expectedCount` does **not** guarantee that the list has settled or contains the expected items.

### Common Failure Modes:
1. **Incremental Replacement / Re-rendering**: If a table or list starts with 3 skeleton loaders or 3 stale items, `expect(rows).toHaveCount(3)` passes immediately while the stale/skeleton elements are still on screen.
2. **Filtering & Search Transitions**: When filtering from 3 items to 3 different items, checking count `3` passes on the old items before the network response arrives and re-renders the list.
3. **Continuous Streaming / Pagination**: A list growing from 0 to 5 might pass a check for `toHaveCount(2)` midway through loading.

### Guidance: Assert Expected Identities, Not Just Count
Verify element contents or specific item identities, not just count, using retrying list assertions on stable test IDs or accessibility roles/labels. Identities beat counts, but they remain a point-in-time observation: whether the list can change again is decided by the application contract (Section 3), never inferred from an assertion.

```ts
// Retrying assertion observing exact expected identities and ordering (stable test IDs/keys).
// It does not freeze later membership or order changes:
await expect(pages.catalog.productCards).toHaveText([
  'prod-sku-alpha',
  'prod-sku-beta',
  'prod-sku-gamma',
]);
```

### Partial or Unordered Collections: Target-Only Contract vs Full Readiness
When asserting an individual element in a large, streaming, or unordered list:
- Asserting a single visible target proves **only that specific target is present**; it does **not** prove full collection completion, stability, or readiness.
- Never treat target visibility as a proxy for the entire collection being loaded:

```ts
// Target-only contract: proves this specific item exists, NOT that the collection is fully loaded
await expect(pages.catalog.productCardBySku('prod-sku-gamma')).toBeVisible();
```

---

## 3. Application Contracts for Readiness

When test operations require enumerating, filtering, or interacting with dynamic lists, rely on application completion contracts rather than arbitrary delays (`page.waitForTimeout` / hard sleeps). A completion signal proves loading finished; for positional enumeration it must additionally declare that membership and order stay fixed for the enumeration window (e.g. a terminal, non-updating snapshot). Without that declaration, target elements by stable ID instead of position.

### Readiness Signals:
- **Loading Indicators / Spinners**: Wait for spinners or skeleton states to disappear:
  ```ts
  await expect(pages.common.loadingSpinner).toBeHidden();
  ```
- **Terminal Status / Badges**: Wait for an explicit completion state badge or summary banner:
  ```ts
  await expect(pages.sync.statusBadge).toHaveAttribute('data-status', 'synced');
  ```
- **Network / Container Attributes**: If the application sets an attribute upon data resolution (e.g. `aria-busy="false"` or `data-loaded="true"`):
  ```ts
  await expect(pages.feed.container).toHaveAttribute('aria-busy', 'false');
  ```
- **Contract Completion Element**: Wait for a completion indicator (e.g. results banner with stable ID):
  ```ts
  await expect(pages.search.resultsBanner).toHaveAttribute('data-complete', 'true');
  ```

---

## 4. Selection within Collections: Avoid Index Selectors

Do not use `.nth()` or index-based CSS selectors (`li:nth-child(2)`) to target dynamic list items.

- **Fragile**: Changes in server sort order or asynchronous item arrival break index assumptions.
- **Ladder-Compliant**: Target elements by role/label combined with stable identifiers, or expose parameterized POM methods:
  ```ts
  // Avoid: index-based targeting
  // pages.cart.lineItems.nth(2).getByRole('button', { name: 'delete' });

  // Preferred: Scoped POM action method using stable identifier
  await pages.cart.removeLineItem('item-sku-1042');
  ```

---

## Primary References & Sources

- Playwright `Locator.all()` Documentation: https://playwright.dev/docs/api/class-locator#locator-all
- Playwright Web-First Assertions: https://playwright.dev/docs/best-practices#use-web-first-assertions
- Playwright Locator Filtering: https://playwright.dev/docs/locators#filtering-locators
