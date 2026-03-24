---
name: angular-testing
description: "Write Angular component tests using TestBed, ComponentHarness, and HttpTestingController with proper signal input handling. Use when writing component tests, mocking HTTP calls, or testing signal inputs. (triggers: **/*.spec.ts, TestBed, ComponentFixture, TestHarness, provideHttpClientTesting)"
---

# Testing

## **Priority: P1 (HIGH)**

## 1. Query via Component Harnesses

- Always use `ComponentHarness` (e.g., `MatButtonHarness`) instead of CSS selectors — harnesses are stable across DOM changes.

```typescript
it('should submit form on button click', async () => {
  const loader = TestbedHarnessEnvironment.loader(fixture);
  const button = await loader.getHarness(MatButtonHarness.with({ text: 'Submit' }));
  await button.click();
  expect(component.submitted).toBe(true);
});
```

## 2. Mock HTTP with HttpTestingController

- Use `provideHttpClientTesting()` instead of manual HttpClient mocks.
- Call `expectOne`, `.flush(mockData)`, and `verify()` in `afterEach`.

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

## 3. Test Signal Inputs Correctly

- Use `fixture.componentRef.setInput('name', value)` — do NOT assign directly.
- Call `fixture.detectChanges()` after `setInput()`.
- Signals update synchronously — `fakeAsync` is usually not needed.

## 4. Choose Your Test Runner

- Angular v20+ supports **Vitest** natively via `@angular/build:unit-test`. Faster, native ESM, no Karma needed.
- Jasmine/Karma still supported for existing projects.

## Anti-Patterns

- **No DOM CSS selectors**: Query via `ComponentHarness`, not CSS class strings.
- **No manual HttpClient mock**: Use `provideHttpClientTesting()` + `HttpTestingController`.
- **No direct @Input() assignment**: Use `fixture.componentRef.setInput()` for signal inputs.

## References

- [Harness Pattern](references/harness-pattern.md)
