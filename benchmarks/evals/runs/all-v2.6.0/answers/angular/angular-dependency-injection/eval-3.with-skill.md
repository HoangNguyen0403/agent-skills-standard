Declare the service with `@Injectable()` and provide it on the route that owns its lifetime:

```ts
// checkout-state.service.ts
import { Injectable, inject } from '@angular/core';
import { CartService } from './cart.service';

@Injectable()
export class CheckoutState {
  private readonly cart = inject(CartService);
  step = 1;

  nextStep(): void {
    this.step += 1;
  }
}
```

Register it in the route configuration:

```ts
// app.routes.ts
import { Routes } from '@angular/router';
import { CheckoutState } from './checkout-state.service';

export const routes: Routes = [
  {
    path: 'checkout',
    providers: [CheckoutState],
    loadComponent: () =>
      import('./checkout-page.component').then(m => m.CheckoutPageComponent),
  },
];
```

Any component, guard, resolver, or child route under `checkout` can inject `CheckoutState`:

`private readonly checkout = inject(CheckoutState);`

The route provider creates a route-tree-scoped instance. Descendants share that instance, and Angular destroys it when the route tree is left. Do not also make this state service `providedIn: 'root'` unless a root fallback is intentional; a route provider can shadow a root provider and produce separate instances. Use `providedIn: 'root'` for true application-wide singletons, not for state that belongs only to this route.

