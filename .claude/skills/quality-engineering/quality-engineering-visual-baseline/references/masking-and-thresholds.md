# Masking and Thresholds

## What to mask

| Region | Why | How (Playwright) |
| --- | --- | --- |
| Clocks, dates, countdowns | change every run | `mask: [page.getByTestId('header-clock-text')]` |
| Counters, badges, totals from live data | seeded but drift | mask, or seed deterministically and do not mask |
| Avatars, user-generated images, ads, maps, video | third-party or random | mask |
| Animated or skeleton loaders | timing | freeze animations, wait for the final state, no mask |
| Randomised ids in visible text | test data | seed with fixed ids instead of masking |

Mask by stable locator (test id or role), never by pixel rectangle: a rectangle drifts when the layout moves and then hides the regression you wanted.

## Freeze before capture

```ts
await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }' });
await page.clock.setFixedTime(new Date('2026-01-15T10:00:00Z'));
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
```

## Thresholds

| Region type | `maxDiffPixelRatio` | Notes |
| --- | --- | --- |
| Text, controls, icons | `0.001` (0.1%) | anti-aliasing only |
| Images, charts, gradients | `0.01` (1%) | compression and rendering noise |
| Whole page | never above `0.01` | above this the check is effectively off |

Playwright example with per-assertion threshold and masks:

```ts
await expect(page).toHaveScreenshot('checkout-summary-desktop.png', {
  mask: [page.getByTestId('header-clock-text'), page.getByTestId('profile-avatar-image')],
  maxDiffPixelRatio: 0.001,
  animations: 'disabled',
});
```

Mobile equivalents live in [Tool Matrix](tool-matrix.md).
