# Centralize `API_URL` configuration

Do not keep the URL as a duplicated module constant. Define one configuration boundary, read the value from the deployment environment, validate it once, and inject it into the clients or services that need it. This follows DRY and dependency inversion while avoiding mutable global state.

```ts
export type AppConfig = Readonly<{
  apiBaseUrl: string;
}>;

export function loadAppConfig(
  environment: Record<string, string | undefined>,
): AppConfig {
  const configuredApiUrl = environment.API_URL?.trim();
  if (!configuredApiUrl) {
    throw new Error("API_URL must be configured");
  }

  const apiUrl = new URL(configuredApiUrl);
  if (apiUrl.protocol !== "https:") {
    throw new Error("API_URL must use HTTPS");
  }

  return Object.freeze({ apiBaseUrl: apiUrl.toString().replace(/\/$/, "") });
}
```

Construct the application once with the loaded configuration:

```ts
export class ApiClient {
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfig,
  ) {}

  getUser(userId: string): Promise<User> {
    const endpoint = `${this.config.apiBaseUrl}/users/${encodeURIComponent(userId)}`;
    return this.http.get<User>(endpoint);
  }
}
```

Replace the twelve copies with either `loadAppConfig(process.env)` at the composition root or an application-specific environment adapter such as `import.meta.env.VITE_API_URL` for a browser build. Feature modules should receive `AppConfig` or `ApiClient`; they should not read environment variables themselves. Keep the URL in deployment configuration (for example, an environment-specific `.env` supplied by the runtime), and do not put credentials in it.

Tests can inject a fixture configuration and a fake `HttpClient`, so they do not depend on the host environment. Add startup tests for a missing URL, malformed URL, and disallowed protocol. This gives one source of truth and fails early instead of allowing twelve files to drift independently.


