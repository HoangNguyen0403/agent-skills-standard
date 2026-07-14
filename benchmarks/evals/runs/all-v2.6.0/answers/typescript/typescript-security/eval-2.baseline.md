Keep the JWT signing secret outside the repository and outside client-side code. In development it can come from an environment variable loaded locally; in production use the platform's secret manager or a workload identity to provide it to the server.

```ts
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET is missing or too weak");
}
```

Do not commit the secret, put it in a browser bundle, log it, or use the same value across environments. Restrict access, rotate it, and have a key-revocation strategy. For a multi-service system, asymmetric signing keys with a private key kept by the issuer and a published verification key can reduce the blast radius. Validate the token algorithm, issuer, audience, expiry, and required claims when verifying; storage also matters, so prefer secure, HttpOnly, appropriately scoped cookies for browser sessions rather than exposing long-lived tokens to JavaScript.
