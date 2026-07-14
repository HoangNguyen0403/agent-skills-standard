Make the header clock deterministic in visual tests:

```ts
await page.addStyleTag({
  content: `
    .header-clock,
    .header-clock * {
      animation: none !important;
      transition: none !important;
    }
  `,
});

await expect(page).toHaveScreenshot({
  animations: 'disabled',
  mask: [page.locator('.header-clock')],
});
```

If the clock’s displayed time is dynamic, mock/freeze the application clock to a fixed value before rendering. Mask it only if the clock is irrelevant to the screenshot; otherwise render a fixed timestamp and disable its rotation.
