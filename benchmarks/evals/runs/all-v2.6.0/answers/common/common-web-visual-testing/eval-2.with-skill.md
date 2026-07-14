Mask the dynamic clock in visual tests.

```bash
playwright-cli screenshot --mask="header .clock"
```

Or hide it only during the screenshot:

```js
await page.locator('header .clock').evaluate(el => {
  el.style.opacity = '0';
});
```

Then verify comparatively:

1. **Before**: capture `snapshot --aria` and screenshot from prod/main.
2. **After**: capture the same from the fixed branch.
3. Compare the diff and check neighboring header elements for layout shift or accidental masking.
4. Repeat at mobile `375px` and tablet `768px`; also check the loading state for CLS.

Prefer masking the clock rather than changing production behavior.
