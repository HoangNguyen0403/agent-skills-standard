Create a typed `InjectionToken` for configuration instead of using a string token or trying to inject a TypeScript interface. Interfaces do not exist at runtime, while an `InjectionToken` is a runtime identity:

```ts
// api-config.ts
import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  baseUrl: string;
  timeoutMs: number;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');
```

Provide the value in the application configuration:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { API_CONFIG } from './api-config';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: API_CONFIG,
      useValue: {
        baseUrl: 'https://api.example.com',
        timeoutMs: 10_000,
      },
    },
  ],
};
```

Consume it with `inject()`:

```ts
import { Injectable, inject } from '@angular/core';
import { API_CONFIG } from './api-config';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly config = inject(API_CONFIG);

  usersUrl(): string {
    return this.config.baseUrl + '/users';
  }
}
```

Use `useValue` for a known configuration object. Use `useFactory` only when the value must be assembled from runtime dependencies, and keep the token’s generic type aligned with the supplied value. The description passed to `InjectionToken` helps identify the token in diagnostics; it is not the value being injected.


