Use Angular’s HTTP transfer cache through `withHttpTransferCacheOptions()` as a feature of `provideClientHydration()`. The server performs the request, serializes the response into the rendered page, and the browser reuses that response during hydration instead of immediately issuing the same GET again:

```ts
import { provideHttpClient } from '@angular/common/http';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';

export const appConfig = {
  providers: [
    provideHttpClient(),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includePostRequests: false,
      }),
    ),
  ],
};
```

Leave POST caching disabled unless the operation is explicitly safe and idempotent. The cache is most appropriate for repeatable GET requests, and the request URL/parameters must identify the data correctly; otherwise one user or query can receive another request’s transferred result. Do not put private or user-sensitive data into HTML that is sent to the browser.

For data that is not an `HttpClient` response, or when the cache key/lifetime needs manual control, use `TransferState`:

```ts
const key = makeStateKey<Product>(`product:${id}`);

if (this.transferState.hasKey(key)) {
  return of(this.transferState.get(key, null));
}

return this.http.get<Product>(`/api/products/${id}`).pipe(
  tap((product) => {
    if (isPlatformServer(this.platformId)) {
      this.transferState.set(key, product);
    }
  }),
);
```

Use a key that includes every input affecting the result, set the value on the server only, and read it before making the client request. This prevents the server-rendered value and the hydrated client from both fetching the same resource.

