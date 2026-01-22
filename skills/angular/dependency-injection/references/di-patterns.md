# DI Patterns

## `inject()` Usage

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  // vs
  // constructor(private http: HttpClient) {}
}
```

## Injection Tokens (Configuration)

```typescript
export const API_URL = new InjectionToken<string>('API_URL');

// In app.config.ts
providers: [{ provide: API_URL, useValue: 'https://api.example.com' }];

// Usage
const apiUrl = inject(API_URL);
```

## Interface Abstraction

```typescript
export const LOGGER = new InjectionToken<Logger>('LOGGER');

// Provide different implementation for Dev/Prod or Test
{ provide: LOGGER, useClass: ProductionLogger }
```
