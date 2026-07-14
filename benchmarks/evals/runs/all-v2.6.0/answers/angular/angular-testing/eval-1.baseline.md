# Writing an Angular unit test with `TestBed`

`TestBed` creates a small Angular testing module, instantiates the component, and gives you a `ComponentFixture` for driving change detection and inspecting the rendered DOM.

For a standalone component, put the component in `imports`:

```ts
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('CounterComponent', () => {
  let fixture: ComponentFixture<CounterComponent>;
  let component: CounterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
  });

  it('starts at zero', () => {
    expect(component.count()).toBe(0);
  });

  it('renders and updates the count', () => {
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    const value = fixture.nativeElement.querySelector('[data-testid="count"]');

    expect(value.textContent.trim()).toBe('0');

    button.click();
    fixture.detectChanges();

    expect(value.textContent.trim()).toBe('1');
  });
});
```

`CounterComponent` in this example might have a template such as:

```html
<span data-testid="count">{{ count() }}</span>
<button type="button" (click)="increment()">Increment</button>
```

The important fixture operations are:

- `fixture.componentInstance` gives access to the class instance.
- `fixture.detectChanges()` runs Angular change detection. Call it after setting inputs or changing state when you want to assert the DOM.
- `fixture.nativeElement` is the rendered host element. `fixture.debugElement` is useful when you need Angular-aware queries or injected providers.

For a non-standalone component, use `declarations: [CounterComponent]` instead of importing it. Add child components, directives, pipes, and providers to the test module as needed. For a dependency, prefer a test double:

```ts
const analytics = jasmine.createSpyObj('AnalyticsService', ['track']);

await TestBed.configureTestingModule({
  imports: [CheckoutComponent],
  providers: [{ provide: AnalyticsService, useValue: analytics }],
}).compileComponents();
```

Configure the test module before creating the fixture, set inputs before the first `detectChanges()`, and assert observable behavior—rendered output, emitted events, and calls to collaborators—rather than private implementation details. Use `fakeAsync`/`tick` or `async`/`await` for asynchronous work, and reset or recreate spies in `beforeEach` so tests remain isolated.


