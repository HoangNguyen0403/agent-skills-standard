Assuming the form uses Laravel’s `web` middleware, add the `@csrf` directive inside every state-changing form:

```blade
<form method="POST" action="{{ route('profile.update') }}">
    @csrf

    <!-- fields -->
    <button type="submit">Save</button>
</form>
```

Laravel renders a hidden `_token` input, and `VerifyCsrfToken` validates it automatically.

For AJAX requests, send the token in the `X-CSRF-TOKEN` header:

```blade
<meta name="csrf-token" content="{{ csrf_token() }}">
```

```js
fetch('/profile', {
  method: 'POST',
  headers: {
    'X-CSRF-TOKEN': document
      .querySelector('meta[name="csrf-token"]')
      .content,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

Do not disable CSRF verification or exclude form routes from the middleware.
