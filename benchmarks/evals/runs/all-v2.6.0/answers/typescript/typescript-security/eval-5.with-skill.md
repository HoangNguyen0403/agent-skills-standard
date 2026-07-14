Do not fetch `process.env.API_URL` until it has been parsed and checked against an explicit allow-list. Environment configuration is not automatically trusted, and unrestricted URLs create an SSRF risk:

```ts
const rawApiUrl = process.env.API_URL;
if (!rawApiUrl) {
  throw new Error("API_URL is required");
}

const apiUrl = new URL(rawApiUrl);
const allowedOrigins = new Set(["https://api.example.com"]);
if (apiUrl.protocol !== "https:" || !allowedOrigins.has(apiUrl.origin)) {
  throw new Error("API_URL is not an allowed HTTPS origin");
}

const response = await fetch(apiUrl, {
  redirect: "error",
});
if (!response.ok) {
  throw new Error(`API request failed: ${response.status}`);
}
```

Keep credentials out of the URL, validate any path/query inputs separately, and enforce the same destination policy server-side rather than relying on a client-side check.
