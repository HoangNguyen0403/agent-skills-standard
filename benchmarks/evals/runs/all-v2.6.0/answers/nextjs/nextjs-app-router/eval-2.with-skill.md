# Route groups

Place the auth pages under a parenthesized route group, for example:

```text
app/
  (auth)/
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
```

The `(auth)` segment organizes layouts and code but is excluded from the URL, so the routes remain `/login`, `/register`, and `/forgot-password`. Add `app/(auth)/layout.tsx` for shared auth UI; route groups must not define conflicting paths.

