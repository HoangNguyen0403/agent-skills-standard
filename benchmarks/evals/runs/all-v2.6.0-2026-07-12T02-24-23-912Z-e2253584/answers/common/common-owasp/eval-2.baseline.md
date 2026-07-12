`Access-Control-Allow-Origin: *` allows any website to make cross-origin requests readable by browser JavaScript. That is generally inappropriate for authenticated routes. Browsers will not send credentialed requests with a wildcard origin when cookies or HTTP authentication are involved, but changing this to allow credentials broadly—or relying on bearer tokens stored in browser-accessible locations—can create cross-origin data exposure. Public, non-sensitive endpoints may use `*`; authenticated endpoints should use a narrowly allowlisted set of trusted origins.

Configure CORS per route or trust boundary: validate the request's `Origin` against an exact server-side allowlist, return that origin only when it is allowed, and add `Vary: Origin` when the response varies by origin. Set `Access-Control-Allow-Credentials: true` only when cookie-based credentials are required, never combine it with `*`, and allow only the required methods and headers. Do not treat CORS as authentication or authorization; enforce authorization on every API request. Also use appropriate cookie protections (`Secure`, `HttpOnly`, and an intentional `SameSite` setting), CSRF protection where cross-site cookies are possible, and avoid reflecting arbitrary `Origin` values.

For example, a trusted frontend at `https://app.example.com` could receive:

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
Vary: Origin
```

All other origins should receive no permissive CORS headers, and the server must still reject unauthorized requests independently of the browser's CORS behavior.
