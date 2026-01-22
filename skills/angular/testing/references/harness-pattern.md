# Harness Pattern

## Using Harnesses

Instead of `fixture.nativeElement.querySelector('button')`, use a harness.

```typescript
// button.harness.ts
export class ButtonHarness extends ComponentHarness {
  static hostSelector = 'app-button';
  protected getButton = this.locatorFor('button');

  async click() {
    const btn = await this.getButton();
    await btn.click();
  }

  async getText() {
    const btn = await this.getButton();
    return btn.text();
  }
}

// component.spec.ts
it('should save on click', async () => {
  const btn = await loader.getHarness(ButtonHarness);
  await btn.click();
  expect(component.saved).toBeTrue();
});
```
