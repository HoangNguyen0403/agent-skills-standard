# Testing signal inputs in Angular components

An input created with `input()` is a read-only signal from the component's point of view. Do not assign to it directly. Set it through the component reference with `fixture.componentRef.setInput(...)`, then run change detection before asserting the rendered result or a computed value.

Example component:

```ts
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

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
  user = input.required<User>();
  label = computed(() => `${this.user().name} (${this.user().role})`);
}
```

Its test can set and replace the input like this:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';

describe('UserBadgeComponent', () => {
  let fixture: ComponentFixture<UserBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserBadgeComponent);
  });

  it('renders the initial signal input', () => {
    fixture.componentRef.setInput('user', {
      name: 'Ada Lovelace',
      role: 'Engineer',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.user()).toEqual({
      name: 'Ada Lovelace',
      role: 'Engineer',
    });
    expect(
      fixture.nativeElement.querySelector('[data-testid="label"]').textContent,
    ).toContain('Ada Lovelace (Engineer)');
  });

  it('reacts when the parent changes the input', () => {
    fixture.componentRef.setInput('user', { name: 'Ada', role: 'Engineer' });
    fixture.detectChanges();

    fixture.componentRef.setInput('user', { name: 'Grace', role: 'Scientist' });
    fixture.detectChanges();

    expect(fixture.componentInstance.label()).toBe('Grace (Scientist)');
    expect(
      fixture.nativeElement.querySelector('[data-testid="name"]').textContent,
    ).toContain('Grace');
  });
});
```

Because `user` is required, set it before the first `detectChanges()`. `createComponent` itself does not normally run the first change detection cycle, which allows the test to provide the required value first. For a normal `input<User>()`, the same `setInput` API applies. If the component uses an input alias, use the public input name expected by `ComponentRef.setInput` for the Angular version in use.

For a more realistic binding test, create a small host component and bind `[user]="user"` to the child. That verifies the parent-to-child template binding; `setInput` is usually the simpler unit test for the child itself. Test effects and computed signals through their observable outcomes, and avoid mutating the input signal from inside the component.


