# Smart and dumb components in Angular

Use a smart (container) component for data access, state, and feature actions. Use a dumb (presentational) component for rendering: it receives data through inputs and reports user intent through outputs. This keeps data concerns separate from rendering and makes the presentational component easy to test.

```ts
// orders-page.component.ts: smart/container component
@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [OrderListComponent],
  template: `
    <app-order-list
      [orders]="orders()"
      (orderSelected)="openOrder($event)" />
  `,
})
export class OrdersPageComponent {
  private readonly ordersApi = inject(OrdersApiService);
  readonly orders = signal<readonly Order[]>([]);

  openOrder(orderId: string): void {
    // Coordinate navigation, commands, or other feature behavior here.
  }
}
```

```ts
// order-list.component.ts: dumb/presentational component
@Component({
  selector: 'app-order-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (order of orders; track order.id) {
      <button type="button" (click)="orderSelected.emit(order.id)">
        {{ order.number }}
      </button>
    }
  `,
})
export class OrderListComponent {
  @Input({ required: true }) orders: readonly Order[] = [];
  @Output() orderSelected = new EventEmitter<string>();
}
```

The presentational component should not inject the API service, navigate, load data, or own business rules. Keep its logic limited to presentation and emitting user events. Use Signals in the container for applicable local state, and use `OnPush` for predictable rendering. Put a dumb component under its feature when it is feature-specific; move it to `shared/` only when it is truly reusable across features. New components should be standalone rather than wrapped in an NgModule.

