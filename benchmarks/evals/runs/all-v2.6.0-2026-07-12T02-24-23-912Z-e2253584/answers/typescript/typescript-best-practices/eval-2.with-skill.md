Use a top-level async function with an explicit return type and `Promise.all()` so independent requests run concurrently. Check HTTP failures and narrow caught errors as `unknown`:

```ts
interface User {
  readonly id: string;
}

interface Report {
  readonly total: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${url}`);
  }
  return (await response.json()) as T;
}

export async function fetchDashboardData(
  userUrl: string,
  reportUrl: string,
): Promise<readonly [User, Report]> {
  try {
    return await Promise.all([
      fetchJson<User>(userUrl),
      fetchJson<Report>(reportUrl),
    ]);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error("Unable to load dashboard data", { cause: error });
    }
    throw new Error("Unable to load dashboard data");
  }
}
```

At an external boundary, validate the JSON with a runtime schema such as Zod rather than relying only on the generic type assertion. Keep the API as a named export and avoid a `.then().catch()` chain.
