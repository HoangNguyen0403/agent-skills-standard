Add `@csrf` to every state-changing Blade form handled by web routes:

```blade
<form method="POST" action="{{ route('posts.store') }}">
    @csrf
    <!-- validated fields -->
</form>
```

Laravel's web middleware verifies the submitted token. Keep CSRF protection enabled for normal browser routes; exclude a path only when it is a deliberately authenticated third-party callback such as a signed webhook, and replace CSRF with that callback's signature verification. Do not disable CSRF globally or assume that a hidden field alone replaces authorization and input validation.

