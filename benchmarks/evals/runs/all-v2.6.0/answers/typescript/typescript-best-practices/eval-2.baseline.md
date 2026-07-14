Start all requests before awaiting any of them, then await the aggregate promise:

```ts
type ApiResult = { id: string; name: string };

async function fetchFromApis(urls: readonly string[]): Promise<ApiResult[]> {
  const requests = urls.map(async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${url}`);
    }
    return (await response.json()) as ApiResult;
  });

  return Promise.all(requests);
}
```

`map` creates each request immediately, so the network operations run in parallel. `Promise.all` rejects when any request fails. If partial results are acceptable, use `Promise.allSettled` and handle each fulfilled or rejected result explicitly. In production, also add an abort timeout, validate the decoded JSON at the boundary, and limit concurrency when the URL list can be large.
