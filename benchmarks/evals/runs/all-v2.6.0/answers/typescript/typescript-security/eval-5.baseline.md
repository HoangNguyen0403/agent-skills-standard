An environment variable is not a trusted URL. Parse it and enforce a narrow outbound policy before fetching:

```ts
const rawUrl = process.env.API_URL;
if (!rawUrl) throw new Error("API_URL is missing");

const url = new URL(rawUrl);
if (url.protocol !== "https:" || url.username || url.password) {
  throw new Error("API_URL must be an HTTPS URL without credentials");
}

const allowedHosts = new Set(["api.example.com"]);
if (!allowedHosts.has(url.hostname)) {
  throw new Error("API_URL host is not allowed");
}

const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
```

Without these controls, a compromised configuration can cause SSRF, including requests to localhost, cloud metadata services, or internal network addresses. For user-controlled or dynamically resolved hosts, also resolve and block private/link-local/loopback addresses, re-check redirects, restrict ports, and use an egress proxy or network policy. Validate the response before treating it as the expected data.
