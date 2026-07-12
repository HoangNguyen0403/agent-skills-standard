# Prefetching data with a route resolver

A resolver runs after guards allow navigation and before Angular activates the route. Return the data from a functional `ResolveFn`, then register it under a key in the route's `resolve` map.

```ts
// product.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Product } from './product';
import { ProductService } from './product.service';

export const productResolver: ResolveFn<Product> = route => {
  const id = route.paramMap.get('id');
  if (!id) {
    throw new Error('The product id is required');
  }

  return inject(ProductService).getById(id);
};
```

Use it in the route:

```ts
export const routes: Routes = [
  {
    path: 'products/:id',
    resolve: { product: productResolver },
    loadComponent: () =>
      import('./product-detail.component').then(m => m.ProductDetailComponent),
  },
];
```

The component can read the resolved value from `ActivatedRoute`:

```ts
readonly product$ = inject(ActivatedRoute).data.pipe(
  map(data => data['product'] as Product)
);
```

Or, with `withComponentInputBinding()` enabled in `provideRouter`, declare an input named `product` and let the router bind the resolved value directly:

```ts
readonly product = input.required<Product>();
```

Navigation waits for the resolver's promise or observable. `HttpClient` observables complete naturally; a long-lived observable must be limited, for example with `take(1)`, or navigation will remain pending. Handle expected failures deliberately. A resolver error cancels navigation unless the resolver catches it and returns a suitable fallback or redirect, for example:

```ts
export const productResolver: ResolveFn<Product> = route => {
  const router = inject(Router);
  const service = inject(ProductService);
  const id = route.paramMap.get('id')!;

  return service.getById(id).pipe(
    catchError(() => of(new RedirectCommand(router.parseUrl('/not-found'))))
  );
};
```

Resolvers are best for data required to render the destination or to decide whether it exists. They block the transition, so nonessential or slow content is often better loaded after activation with a loading state.

