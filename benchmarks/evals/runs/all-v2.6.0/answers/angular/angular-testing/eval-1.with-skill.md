# Writing an Angular unit test with `TestBed`

`TestBed` creates the Angular testing environment, while `ComponentFixture` owns the component instance and its change-detection lifecycle. Configure the test module before creating the fixture. For a standalone component, import it directly; for an NgModule-based component, declare it and import the modules its template needs.

The example below assumes a standalone `CounterComponent` with a `count()` signal, an `app-counter` host selector, a `data-testid="count"` element, and an accessible increment button. The test uses a harness for DOM interaction so the spec does not depend on the template's CSS structure.

```ts
import { ComponentHarness, HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CounterComponent } from './counter.component';

class CounterHarness extends ComponentHarness {
  static hostSelector = 'app-counter';

  private readonly count = this.locatorFor('[data-testid="count"]');
  private readonly increment = this.locatorFor(
    'button[aria-label="Increment"]',
  );

  async getCount(): Promise<string> {
    return (await this.count()).text();
  }

  async incrementByUser(): Promise<void> {
    await (await this.increment()).click();
  }
}

describe('CounterComponent', () => {
  let fixture: ComponentFixture<CounterComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('increments when the user clicks the increment button', async () => {
    fixture.detectChanges();
    const counter = await loader.getHarness(CounterHarness);

    expect(await counter.getCount()).toBe('0');

    await counter.incrementByUser();

    expect(await counter.getCount()).toBe('1');
    expect(fixture.componentInstance.count()).toBe(1);
  });
});
```

`fixture.componentInstance` is useful for class-level state, but assert the rendered behavior through a harness when the behavior is user-visible. Call `fixture.detectChanges()` after setup or a synchronous state change when the DOM must be updated. Harness interactions normally stabilize and run change detection around the interaction.

For a required signal input, set it before the first change-detection pass:

```ts
fixture.componentRef.setInput('name', 'Ada');
fixture.detectChanges();
```

Keep each test isolated by creating a new fixture in `beforeEach`; configure providers, child components, directives, and pipes in the same `TestBed` configuration before `createComponent()`.

