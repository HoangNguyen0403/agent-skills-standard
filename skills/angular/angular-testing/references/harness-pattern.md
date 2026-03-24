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

## MatButtonHarness Example

```typescript
it('should submit form on button click', async () => {
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const button = await loader.getHarness(MatButtonHarness.with({ text: 'Submit' }));
  await button.click();
  expect(component.submitted).toBe(true);
});
```

## HttpTestingController Example

```typescript
beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [UserComponent],
    providers: [provideHttpClient(), provideHttpClientTesting()]
  });
  httpTesting = TestBed.inject(HttpTestingController);
});

afterEach(() => httpTesting.verify());

it('should load users', () => {
  const req = httpTesting.expectOne('/api/users');
  req.flush([{ id: 1, name: 'Alice' }]);
  expect(component.users().length).toBe(1);
});
```
