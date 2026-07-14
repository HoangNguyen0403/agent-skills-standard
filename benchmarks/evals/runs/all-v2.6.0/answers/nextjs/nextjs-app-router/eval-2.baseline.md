Use a route group. Parentheses group routes for organization without adding a URL segment:

```text
app/
  (auth)/
    login/page.tsx          # /login
    register/page.tsx       # /register
    forgot-password/page.tsx # /forgot-password
```

The `(auth)` directory is omitted from the public pathname. You can place a `layout.tsx` inside the group for shared authentication-page UI, such as a centered card or auth-specific providers. Route groups can also have their own layout, but remember that separate root layouts can cause a full document reload when navigating between groups. Use the group only for organization/layout boundaries; still enforce authentication and authorization on the server for protected routes.

