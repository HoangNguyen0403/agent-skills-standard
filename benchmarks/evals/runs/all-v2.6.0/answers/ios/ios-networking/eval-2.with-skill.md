Store tokens securely in the Keychain, not in `UserDefaults` or hardcoded in code.

For requests, inject the token into every `URLRequest` as:

`Authorization: Bearer <token>`

Good pattern on iOS:

- Keep a small auth/token store that reads the current access token from Keychain
- Centralize request building so auth headers are added in one place
- If you use Alamofire, use a `RequestInterceptor` to attach the bearer token automatically
- On `401 Unauthorized`, refresh the token, save the new token, and retry the request once
- Set reasonable request timeouts and avoid leaking tokens into logs

If you use `URLSession`, wrap this in an API client so token handling is not repeated across screens. If you use Alamofire, `RequestInterceptor` is the cleanest place for both header injection and refresh-on-retry behavior.

