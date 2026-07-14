# A practical `user.component.spec.ts` structure

Without seeing the component source, start by identifying its public contract: inputs, outputs, visible states, user actions, and injected collaborators. The spec should drive those behaviors rather than test private methods. A typical standalone component spec looks like this:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('UserComponent', () => {
  let fixture: ComponentFixture<UserComponent>;
  let component: UserComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserComponent],
      // Add providers here, replacing real services with spies or fakes.
      // providers: [{ provide: UserService, useValue: userServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
  });

  it('renders the supplied user', () => {
    fixture.componentRef.setInput('user', {
      id: 'u1',
      name: 'Ada Lovelace',
    });
    fixture.detectChanges();

    const name = fixture.nativeElement.querySelector('[data-testid="user-name"]');
    expect(name.textContent.trim()).toBe('Ada Lovelace');
  });

  it('emits when the user action is completed', () => {
    const user = { id: 'u1', name: 'Ada Lovelace' };
    fixture.componentRef.setInput('user', user);
    fixture.detectChanges();

    const saved = jasmine.createSpy('saved');
    component.saved.subscribe(saved);

    fixture.nativeElement
      .querySelector('button[data-testid="save"]')
      .click();
    fixture.detectChanges();

    expect(saved).toHaveBeenCalledWith(user);
  });

  it('shows its loading or empty state when applicable', () => {
    fixture.componentRef.setInput('user', null);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="empty-state"]'),
    ).not.toBeNull();
  });
});
```

Replace `user`, `saved`, and the `data-testid` values with the actual public API and selectors in `UserComponent`. If it is not standalone, declare it with `declarations: [UserComponent]` and import the modules its template needs. Set required inputs before the first `detectChanges()`.

For dependencies, create a fresh spy in `beforeEach` and configure its return values before change detection. For example, a service method returning an observable can use `of(user)` for success and `throwError(() => error)` for failure. Assert both the service interaction and the visible result, such as a rendered error message; do not call the private method directly.

Useful test cases usually include:

1. the default or initial state;
2. each meaningful input state (valid, empty, and invalid if applicable);
3. the main user action and its output/event;
4. loading, success, and error states for asynchronous work;
5. disabled controls and boundary cases.

Use `fixture.debugElement.query(By.css(...))` when you need Angular's `DebugElement`, or a component harness when the component has a reusable interaction surface. Keep each test focused on one behavior and recreate fixtures/spies for isolation.


