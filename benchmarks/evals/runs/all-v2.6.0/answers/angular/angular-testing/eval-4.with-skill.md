# Testing signal inputs in Angular component tests

An `input()` value is a read-only signal inside the component. Set it through the fixture's component reference with `setInput()`, not by assigning to `fixture.componentInstance.user`. Run change detection after each input update before asserting a rendered value or a computed signal. Signals update synchronously, so most signal-input tests do not need `fakeAsync`.

For a component with a required input:

```ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

type User = { name: string; role: string };

@Component({
  standalone: true,
  selector: 'app-user-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <strong data-testid="name">{{ user().name }}</strong>
    <span data-testid="label">{{ label() }}</span>
  `,
})
export class UserBadgeComponent {
  readonly user = input.required<User>();
  readonly label = computed(() => `${this.user().name} (${this.user().role})`);
}
```

Test it by setting the public input name before the first detection pass:

```ts
import { ComponentHarness, HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserBadgeComponent } from './user-badge.component';

class UserBadgeHarness extends ComponentHarness {
  static hostSelector = 'app-user-badge';
  private readonly label = this.locatorFor('[data-testid="label"]');

  async getLabel(): Promise<string> {
    return (await this.label()).text();
  }
}

describe('UserBadgeComponent', () => {
  let fixture: ComponentFixture<UserBadgeComponent>;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserBadgeComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('renders the initial signal input', async () => {
    fixture.componentRef.setInput('user', {
      name: 'Ada Lovelace',
      role: 'Engineer',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.user()).toEqual({
      name: 'Ada Lovelace',
      role: 'Engineer',
    });
    expect(fixture.componentInstance.label()).toBe('Ada Lovelace (Engineer)');

    const badge = await loader.getHarness(UserBadgeHarness);
    expect(await badge.getLabel()).toBe('Ada Lovelace (Engineer)');
  });

  it('reacts when the parent changes the input', () => {
    fixture.componentRef.setInput('user', { name: 'Ada', role: 'Engineer' });
    fixture.detectChanges();

    fixture.componentRef.setInput('user', {
      name: 'Grace',
      role: 'Scientist',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.label()).toBe('Grace (Scientist)');
  });
});
```

`createComponent()` does not require an initial detection pass, which is useful for required inputs: provide the value first, then call `detectChanges()`. The same `setInput()` API works for ordinary inputs. If the component uses an input alias, pass the public input name expected by `ComponentRef.setInput()`. A host component with `[user]="user"` is appropriate when the goal is to test the parent-to-child binding itself; `setInput()` is usually the simpler child unit test.

