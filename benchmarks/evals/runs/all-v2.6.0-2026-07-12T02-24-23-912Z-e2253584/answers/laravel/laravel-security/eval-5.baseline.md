Blade forms that use the `web` middleware group are protected by Laravel's CSRF middleware. Include the token in every state-changing form:

```blade
<form method="POST" action="{{ route('profile.update') }}">
    @csrf
    @method('PUT')
    <!-- fields -->
</form>
```

For AJAX, send the token in the `X-CSRF-TOKEN` header or configure the framework's `XSRF-TOKEN` cookie handling. Do not disable CSRF globally; narrowly exclude only a trusted non-browser webhook after authenticating it with a signature or equivalent mechanism. Use `SameSite`/secure cookie settings appropriate to deployment and test rejection of missing/invalid tokens.

