Do not expose a database password to a Client Component. Keep it in a server-only module and use it from a DAL, Server Action, or Route Handler. Only variables explicitly prefixed `NEXT_PUBLIC_` are intended for the browser, and a password must never receive that prefix. Add `import 'server-only'` to the module containing the secret and pass only safe DTOs to the client.

