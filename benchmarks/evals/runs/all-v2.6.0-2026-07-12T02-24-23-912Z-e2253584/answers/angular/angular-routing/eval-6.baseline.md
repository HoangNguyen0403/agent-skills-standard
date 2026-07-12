# Page titles with Angular Router

Set a `title` on each route. Angular's default `TitleStrategy` uses the deepest activated primary route title and updates `document.title` during navigation.

```ts
export const routes: Routes = [
  { path: 'home', title: 'Home', component: HomeComponent },
  {
    path: 'settings',
    title: 'Settings',
    loadComponent: () =>
      import('./settings.component').then(m => m.SettingsComponent),
  },
];
```

For a dynamic title, provide a title resolver. It can use route parameters and services:

```ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { map } from 'rxjs';

export const productTitle: ResolveFn<string> = route => {
  const id = route.paramMap.get('id')!;
  return inject(ProductService).getById(id).pipe(
    map(product => product.name)
  );
};

export const routes: Routes = [
  {
    path: 'products/:id',
    title: productTitle,
    loadComponent: () =>
      import('./product-detail.component').then(m => m.ProductDetailComponent),
  },
];
```

Register the routes normally, for example with `provideRouter(routes)`. A title resolver is evaluated during navigation, so it can delay activation just like other route-resolved work. If the request can fail, return a fallback title or handle the error rather than leaving navigation unexpectedly canceled.

For a site-wide suffix or custom title policy, replace the default strategy:

```ts
@Injectable()
export class AppTitleStrategy extends DefaultTitleStrategy {
  private readonly documentTitle = inject(Title);

  override updateTitle(state: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(state);
    this.documentTitle.setTitle(routeTitle ? `${routeTitle} | Acme` : 'Acme');
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
});
```

This is preferable to subscribing to every `NavigationEnd` yourself because it keeps title selection in the router configuration and works for static and resolved route titles.

