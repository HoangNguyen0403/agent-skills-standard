Define a named limiter and attach it to the API route. In `AppServiceProvider::boot()` or the configured service provider:

```php
RateLimiter::for('api', function (Request $request) {
    return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
});
```

Apply it with `->middleware('throttle:api')`, or define a route group that uses the throttle middleware. Return a `429 Too Many Requests` response with the framework's retry headers when the limit is exceeded. Choose a key appropriate to the threat model (authenticated user, API token, tenant, or IP), and use multiple limits when both burst and sustained traffic need control. Rate-limit expensive endpoints more tightly and test both allowed and rejected requests.

