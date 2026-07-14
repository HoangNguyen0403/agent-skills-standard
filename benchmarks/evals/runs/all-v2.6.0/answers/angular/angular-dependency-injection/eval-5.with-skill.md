In Angular 19+, register an initializer with `provideAppInitializer()` in the application configuration. The initializer function runs in an injection context, so it can resolve a service with `inject()`:

```ts
// config.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface RuntimeConfig {
  apiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly http = inject(HttpClient);
  private config?: RuntimeConfig;

  async load(): Promise<void> {
    this.config = await firstValueFrom(
      this.http.get<RuntimeConfig>('/config.json'),
    );
  }

  get apiUrl(): string {
    if (!this.config) {
      throw new Error('Runtime configuration has not loaded');
    }
    return this.config.apiUrl;
  }
}
```

```ts
// app.config.ts
import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { ConfigService } from './config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideAppInitializer(() => inject(ConfigService).load()),
  ],
};
```

Angular waits for the returned `Promise` to resolve (or for a returned `Observable` to complete) before finishing bootstrap. A rejected promise or failed observable prevents normal startup, so catch the error only if a documented fallback configuration is safe. The initializer should be idempotent and should not be registered repeatedly in feature components.

`provideAppInitializer()` is the functional replacement for the older `APP_INITIALIZER` provider pattern; do not mix both for the same initialization work.


