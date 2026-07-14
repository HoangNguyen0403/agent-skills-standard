Store the JWT signing secret outside source control: use the deployment platform's secret manager in production, and an uncommitted `.env` file supplied through the environment for local development. Never put it in frontend code, a checked-in config file, or a JWT payload.

```ts
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is not configured");
}
```

Load it once during startup, restrict access to the service, rotate it through the secret manager, and use a key identifier/key rotation strategy when needed. Prefer an asymmetric `RS256`/`jose` setup for distributed verification; keep private keys in the secret manager and publish only the public key. Deliver browser tokens in `HttpOnly`, `Secure`, appropriately `SameSite` cookies and validate issuer, audience, expiry, and algorithm when verifying.
