# Preventing duplicate HTTP requests with `TransferState`

The usual cause of double-fetching is that the server makes an HTTP request to produce HTML, then the browser makes the same request while bootstrapping. Angular's hydration support includes an HTTP transfer cache for normal `GET`/`HEAD` requests. Start with:

```ts
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(
      withHttpTransferCacheOptions({
        filter: request => request.url.startsWith('/api/'),
      }),
    ),
  ],
};
```

The server-side HTTP interceptor records eligible responses in Angular's transfer state. The state is serialized into the rendered document, and the browser interceptor consumes the matching response during hydration, so the first browser subscription receives the server result instead of issuing another network request. Configure the cache deliberately: do not transfer user-specific or sensitive responses into shared HTML, and do not cache requests whose results may not safely be reused. Some Angular versions skip requests with authorization headers by default; verify the behavior and configure the policy explicitly when necessary.

For a non-HTTP value, a custom request, or an older Angular setup, use `TransferState` directly. The key must include every input that changes the result:

```ts
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { makeStateKey, TransferState } from '@angular/platform-browser';
import { Observable, of, tap } from 'rxjs';

type Product = { id: string; name: string };

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly transferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);

  load(id: string): Observable<Product> {
    const key = makeStateKey<Product>(`product:${id}`);

    if (this.transferState.hasKey(key)) {
      const value = this.transferState.get(key, null as Product | null);
      this.transferState.remove(key);
      return of(value as Product);
    }

    return this.fetchFromApi(id).pipe(
      tap(product => {
        if (isPlatformServer(this.platformId)) {
          this.transferState.set(key, product);
        }
      }),
    );
  }

  private fetchFromApi(id: string): Observable<Product> {
    // Replace this with HttpClient.get<Product>(`/api/products/${id}`).
    throw new Error(`Implement product request for ${id}`);
  }
}
```

In real code, prefer a nullable state type or a result wrapper rather than relying on a cast if `null` is a valid product value. Remove a consumed entry so it is not reused indefinitely. Also make sure the server and browser use the same URL, query parameters, headers, and serialization; a different cache key or request shape causes a second request even when transfer state is enabled.


