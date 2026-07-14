# Smart and dumb components in Angular

Use a smart component (also called a container) to coordinate application concerns, and a dumb component (presentational component) to render a well-defined view. The pattern is a separation of responsibilities, not a requirement that every component fit one extreme.

The smart component typically:

- injects a facade, store, or API service;
- selects data and exposes view-model state to the template;
- handles routing, commands, loading, and error states; and
- translates child events into application actions.

The dumb component typically:

- receives data through `input()`/`@Input()` values;
- emits user intent through `output()`/`@Output()` events;
- owns local presentation state such as a selected tab; and
- avoids direct API calls, router navigation, and knowledge of global application state.

Example:

```ts
// order-list-page.component.ts: smart/container component
@Component({
  standalone: true,
  imports: [OrderTableComponent],
  template: `
    <app-order-table
      [orders]="orders()"
      [loading]="loading()"
      (orderSelected)="openOrder($event)" />
  `,
})
export class OrderListPageComponent {
  private readonly store = inject(OrdersStore);
  private readonly router = inject(Router);
  readonly orders = this.store.orders;
  readonly loading = this.store.loading;

  openOrder(id: string): void {
    this.router.navigate(['/orders', id]);
  }
}
```

```ts
// order-table.component.ts: dumb/presentational component
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (order of orders(); track order.id) {
      <button type="button" (click)="orderSelected.emit(order.id)">
        {{ order.number }}
      </button>
    }
  `,
})
export class OrderTableComponent {
  readonly orders = input.required<readonly Order[]>();
  readonly loading = input(false);
  readonly orderSelected = output<string>();
}
```

Keep the child API small and domain-appropriate, do not mutate input objects, and let the parent decide what an event means. `OnPush` change detection and immutable inputs make this boundary easier to reason about, although they do not replace correct state management. For a tiny screen, combining the roles can be clearer; split them when data orchestration and reusable presentation are becoming coupled.

