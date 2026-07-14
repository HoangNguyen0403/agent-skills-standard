# JWT storage

Store the JWT in an `HttpOnly`, `Secure` cookie with `SameSite: 'Lax'` or `'Strict'` and an appropriate expiration. Do not put access tokens in `localStorage`, `sessionStorage`, or Client Component props. Read and verify the cookie in middleware and in a server-side DAL/session helper before rendering protected data. For Server Actions and Route Handlers, also validate the request origin to reduce CSRF risk.

