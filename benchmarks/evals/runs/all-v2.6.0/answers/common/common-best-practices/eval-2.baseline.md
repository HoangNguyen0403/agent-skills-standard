Move the constant to one configuration module and import it everywhere else. Twelve copies create drift risk: a future URL change can leave callers pointing at different services.

For example:

```ts
// config/api.ts
export const API_URL = process.env.API_URL ?? "https://api.example.com";
```

Consumers should depend on that module (or, preferably for reusable code, receive the API client/base URL through dependency injection) rather than defining their own URL:

```ts
import { API_URL } from "./config/api";

export const usersEndpoint = `${API_URL}/users`;
```

Because this value is configuration rather than a secret, a checked-in development default can be reasonable, but deployments should be able to override it through environment-specific configuration. Validate the value at startup, normalize trailing slashes, and fail clearly if the application requires it and no valid value is supplied. Do not blindly replace every string occurrence: first identify whether any file intentionally targets a different environment or service.

After centralizing it, search the repository for the old literal and remove duplicate declarations. Add a configuration test or startup check, and test the client with an injected URL so unit tests do not depend on the real endpoint. Keep the configuration boundary separate from business logic so changing deployment settings does not require editing application code.

