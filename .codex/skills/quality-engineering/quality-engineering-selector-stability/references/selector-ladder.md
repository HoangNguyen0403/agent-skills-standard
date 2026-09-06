# Selector Ladder — Per-Tool Code

## Web (Playwright)

```ts
// 1st choice
page.getByRole('button', { name: 'Submit' });
page.getByLabel('Email address');
// 2nd choice (no accessible role/label available)
page.getByTestId('checkout-submit-button');
// Never
page.locator('//div[3]/button'); // XPath
page.locator('.btn-primary-xk21'); // generated class
```

## Mobile (Appium)

```
// 1st choice
~checkout-submit-button        // accessibility id
// 2nd choice
android=new UiSelector().resourceId("com.app:id/submit")
// Never
//android.widget.Button[3]     // XPath
```

## Maestro (YAML)

```yaml
- tapOn:
    id: "checkout-submit-button"
# Never: point-based taps, text: on translated strings
```
