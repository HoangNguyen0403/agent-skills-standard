# A practical `user.component.spec.ts` structure

Without the component source, first map its public contract: inputs, outputs, visible states, user actions, and injected services. Replace the names below with the actual API. For a standalone component, import it in `TestBed`; for an NgModule-based component, declare it and provide the modules its template uses.

The harness keeps the spec focused on behavior instead of template selectors:

```ts
import { ComponentHarness, HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserComponent } from './user.component';

type User = { id: string; name: string };

class UserHarness extends ComponentHarness {
  static hostSelector = 'app-user';

  private readonly name = this.locatorFor('[data-testid="user-name"]');
  private readonly save = this.locatorFor(
    'button[aria-label="Save user"]',
  );
  private readonly empty = this.locatorForOptional(
    '[data-testid="empty-state"]',
  );

  async getName(): Promise<string> {
    return (await this.name()).text();
  }

  async clickSave(): Promise<void> {
    await (await this.save()).click();
  }

  async hasEmptyState(): Promise<boolean> {
    return (await this.empty()) !== null;
  }
}

describe('UserComponent', () => {
  let fixture: ComponentFixture<UserComponent>;
  let component: UserComponent;
  let loader: HarnessLoader;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserComponent],
      // Replace real collaborators here, for example:
      // providers: [{ provide: UserService, useValue: userServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
  });

  it('renders the supplied user', async () => {
    const user: User = { id: 'u1', name: 'Ada Lovelace' };
    fixture.componentRef.setInput('user', user);
    fixture.detectChanges();

    const userView = await loader.getHarness(UserHarness);
    expect(await userView.getName()).toBe('Ada Lovelace');
  });

  it('emits the user when Save is clicked', async () => {
    const user: User = { id: 'u1', name: 'Ada Lovelace' };
    let emitted: User | undefined;
    component.saved.subscribe(value => (emitted = value));

    fixture.componentRef.setInput('user', user);
    fixture.detectChanges();
    await (await loader.getHarness(UserHarness)).clickSave();

    expect(emitted).toEqual(user);
  });

  it('shows the empty state when there is no user', async () => {
    fixture.componentRef.setInput('user', null);
    fixture.detectChanges();

    const userView = await loader.getHarness(UserHarness);
    expect(await userView.hasEmptyState()).toBe(true);
  });
});
```

If `user` is an `input.required<User>()`, do not set it to `null`; use the component's actual optional input or model the empty state through the real API. `setInput()` is also the correct way to provide a signal input and should be followed by `detectChanges()` before assertions. For asynchronous service work, cover loading, success, and error states. If the component makes HTTP requests, use `provideHttpClient()` plus `provideHttpClientTesting()` and assert them with `HttpTestingController`; do not hand-write an `HttpClient` mock. Keep a fresh fixture and fresh service double per test.

