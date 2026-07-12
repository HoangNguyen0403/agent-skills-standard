# The Smart/Dumb component pattern

The Smart/Dumb pattern separates orchestration from presentation:

- A **smart** (container) component obtains data, injects services or a facade, coordinates routing and commands, and owns page-level state.
- A **dumb** (presentational) component renders the data it receives and emits user-intent events. It should not know where data came from or call an application service directly.

For example, the container can own the product query:

```ts
@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [ProductListComponent],
  template: `
    <app-product-list
      [products]="products()"
      [busy]="busy()"
      (productSelected)="openProduct($event)"
    />
  `,
})
export class ProductsPageComponent {
  private readonly productsApi = inject(ProductsApi);
  readonly products = toSignal(this.productsApi.list(), { initialValue: [] });
  readonly busy = signal(false);

  openProduct(product: Product): void {
    // Navigate, update application state, or issue a command here.
  }
}
```

The list component owns only presentation concerns:

```ts
@Component({
  selector: 'app-product-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (busy()) { <p>Loading...</p> }
    @for (product of products(); track product.id) {
      <button type="button" (click)="productSelected.emit(product)">
        {{ product.name }}
      </button>
    } @empty {
      <p>No products.</p>
    }
  `,
})
export class ProductListComponent {
  readonly products = input.required<Product[]>();
  readonly busy = input(false);
  readonly productSelected = output<Product>();
}
```

This makes the dumb component easy to reuse and test with fixed inputs and output assertions. It also gives the container a clear boundary for permissions, loading/error handling, and side effects. “Dumb” does not mean it must contain no logic: formatting, selection state local to the widget, validation of a field, and accessibility behavior can belong there. Keep business workflows and data access above the boundary. For small screens, forcing a separate container can add ceremony; apply the pattern where the separation improves reuse, testing, or ownership rather than treating it as a strict rule.

