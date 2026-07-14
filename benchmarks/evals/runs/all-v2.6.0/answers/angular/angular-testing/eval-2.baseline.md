# Using Angular Component Test Harnesses

Angular CDK component harnesses provide an async, semantic API for interacting with a component under test. They keep tests from depending on internal CSS structure, DOM traversal, or implementation-specific event wiring. Angular Material supplies harnesses for its components, and you can write a custom harness for your own components.

For example, a Material button can be tested with `MatButtonHarness`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonHarness } from '@angular/material/button/testing';

describe('SavePanelComponent', () => {
  let fixture: ComponentFixture<SavePanelComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavePanelComponent, MatButtonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SavePanelComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('saves when the Save button is clicked', async () => {
    const save = jasmine.createSpy('save');
    fixture.componentInstance.saved.subscribe(save);

    const button = await loader.getHarness(
      MatButtonHarness.with({ text: 'Save' }),
    );

    expect(await button.isDisabled()).toBeFalse();
    await button.click();

    expect(save).toHaveBeenCalled();
  });
});
```

Harness methods are asynchronous, so make the test `async` and `await` both lookup and interaction. Common APIs include `getHarness`, `getAllHarnesses`, `hasHarness`, and `locatorFor`. You can scope a lookup to a container with `loader.getChildLoader(...)` or a harness locator.

For an application component, define a custom harness that exposes user-visible behavior:

```ts
import { ComponentHarness } from '@angular/cdk/testing';

export class UserCardHarness extends ComponentHarness {
  static hostSelector = 'app-user-card';

  private name = this.locatorFor('[data-testid="user-name"]');
  private editButton = this.locatorFor('button[aria-label="Edit user"]');

  async getName(): Promise<string> {
    return (await this.name()).text();
  }

  async clickEdit(): Promise<void> {
    await (await this.editButton()).click();
  }
}
```

Then load it from the testbed environment:

```ts
const card = await loader.getHarness(UserCardHarness);
expect(await card.getName()).toBe('Ada Lovelace');
await card.clickEdit();
```

Keep selectors inside the harness, preferably using stable roles, labels, or test IDs. The spec should describe the component contract (`clickEdit`, `getName`, `isDisabled`) and should not need to know how the template is structured. For harnesses running against a real browser, use the corresponding Protractor/WebDriver or Web Test Runner environment instead of `TestbedHarnessEnvironment`.


