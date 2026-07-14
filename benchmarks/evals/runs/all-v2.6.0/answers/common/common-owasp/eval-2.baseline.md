`Access-Control-Allow-Origin: *` on authenticated routes is unsafe and incompatible with credentialed CORS.

Use explicit trusted origins instead:

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
Vary: Origin
```

Apply `*` only to genuinely public, non-credentialed endpoints. Browsers reject `Access-Control-Allow-Origin: *` when credentials are used, so cookie-based authentication will not work cross-origin under this policy. If authentication uses bearer tokens, wildcard CORS can still allow untrusted sites to read responses when users expose/send those tokens.

Assumption: these routes return user-specific or otherwise sensitive data. CORS is not an authentication or authorization boundary; enforce authorization server-side as well.
