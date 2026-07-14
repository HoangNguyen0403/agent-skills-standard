# Creating an `InjectionToken` for configuration

Use an `InjectionToken<T>` when the value is configuration data, an interface, or another token without a runtime class. The generic type gives consumers compile-time type checking, while the token object is the runtime key used by Angular's injector.

```ts
// app-config.ts
import { InjectionToken } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
  production: boolean;
  requestTimeoutMs: number;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('app.config');
```

Provide the value at the application boundary, such as `app.config.ts`:

```ts
import { ApplicationConfig } from '@angular/core';
import { APP_CONFIG, AppConfig } from './app-config';

const config: AppConfig = {
  apiUrl: 'https://api.example.com',
  production: true,
  requestTimeoutMs: 10_000,
};

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: APP_CONFIG, useValue: config },
  ],
};
```

With NgModule bootstrapping, the same provider belongs in the module's `providers` array. With `bootstrapApplication`, pass `appConfig` (or the provider directly) to the bootstrap call.

Consume it with constructor injection or `inject()`:

```ts
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from './app-config';

@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly config = inject(APP_CONFIG);

  getUrl(path: string): string {
    return `${this.config.apiUrl}/${path}`;
  }
}
```

The token must be imported from the same module everywhere; two tokens created with the same description string are still different keys. Do not use a string such as `'APP_CONFIG'` as the provider key. For configuration that must be computed, replace `useValue` with `useFactory` and inject its dependencies in the factory. In tests, provide a test object for `APP_CONFIG` or override the token with `TestBed.overrideProvider`.

