Keep secrets in server-only modules and never pass them through a Client Component boundary. Use environment variables without `NEXT_PUBLIC_`, import the data layer with `server-only`, and perform the secret-dependent operation on the server:

```tsx
// Server Component
const result = await getPrivateAccountData();
return <AccountPanel summary={result.safeSummary} />;
```

Do not return the token/password in props, embed it in rendered HTML, log it, or expose it through an unrestricted Route Handler. A Client Component may receive an allowlisted public DTO or a boolean capability, but authorization must be enforced again in the Server Action/DAL. Avoid importing a module that mixes secret configuration with client-safe helpers; split it into explicit server and shared modules. Review `NEXT_PUBLIC_*`, build-time inlining, source maps, error messages, and third-party client bundles when checking that a secret is not shipped.

