# Using Angular Component Test Harnesses

A component harness is an async, semantic API for interacting with a component as a user would. Angular Material provides harnesses such as `MatButtonHarness`; for a reusable application component, define a custom `ComponentHarness`. Keep DOM locators inside the harness, preferably using stable roles, labels, or test IDs. The spec should call methods such as `clickSave()` or `getName()`, not query CSS classes or traverse `nativeElement`.

For a standalone component using Angular Material:

```ts
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonHarness } from '@angular/material/button/testing';
import { SavePanelComponent } from './save-panel.component';

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

  it('emits a save when the Save button is clicked', async () => {
    const emitted: unknown[] = [];
    fixture.componentInstance.saved.subscribe(value => emitted.push(value));
    fixture.detectChanges();

    const button = await loader.getHarness(
      MatButtonHarness.with({ text: 'Save' }),
    );

    expect(await button.isDisabled()).toBe(false);
    await button.click();

    expect(emitted).toHaveLength(1);
  });
});
```

Harness methods are asynchronous, so make the test `async` and await both lookup and interaction. Useful loader APIs include `getHarness`, `getAllHarnesses`, `hasHarness`, and `countHarnesses`. Use `getChildLoader()` or a harness locator when a component contains a nested region that should be searched independently. Use `documentRootLoader(fixture)` when an interaction creates an overlay attached to `document.body`.

For an application-owned component, expose a small public test API:

```ts
import { ComponentHarness } from '@angular/cdk/testing';

export class UserCardHarness extends ComponentHarness {
  static hostSelector = 'app-user-card';

  private readonly name = this.locatorFor('[data-testid="user-name"]');
  private readonly edit = this.locatorFor(
    'button[aria-label="Edit user"]',
  );

  async getName(): Promise<string> {
    return (await this.name()).text();
  }

  async clickEdit(): Promise<void> {
    await (await this.edit()).click();
  }
}
```

Then the test remains independent of the component's internal markup:

```ts
const card = await loader.getHarness(UserCardHarness);
expect(await card.getName()).toBe('Ada Lovelace');
await card.clickEdit();
```

Harnesses are especially useful for shared interactive widgets. For a one-off page component, a direct fixture assertion can be reasonable, but reusable interaction surfaces should get a harness so refactoring the DOM does not force every consumer test to change.

