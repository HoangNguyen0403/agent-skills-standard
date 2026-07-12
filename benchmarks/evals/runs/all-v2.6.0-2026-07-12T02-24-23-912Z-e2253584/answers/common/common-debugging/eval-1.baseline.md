Treat this as an environment- or data-dependent defect, not as proof that adding a fallback is the right fix.

1. Capture the production stack trace, release/version, request or user correlation ID, route, inputs, and the exact line that reads `length`. Ensure error reporting preserves source maps and does not expose sensitive data.
2. Inspect the expression immediately before `.length`. Identify which value is undefined and trace it backward to its producer: API response, database query, configuration, feature flag, optional component prop, or failed initialization.
3. Compare production and local conditions: build mode and dependency versions, environment variables, API/schema versions, authentication/permissions, data records, locale, timing, caching, and feature-flag cohorts. Reproduce locally with a sanitized production payload or a staging environment that matches production.
4. Add a narrow validation at the boundary where the value enters the component or function. Decide the intended contract: reject malformed data, use an explicitly valid empty collection, or render an error/loading state. Avoid silently converting unexpected data to `[]`, because that can hide an upstream outage.
5. Add a regression test for the failing input and tests for loading, error, missing-field, and valid-empty cases. Deploy the smallest change behind a flag or canary, monitor error rate and behavior, and roll back if necessary.

For example, distinguish an intentionally optional value from a violated contract:

```js
if (!Array.isArray(response.items)) {
  throw new Error("Invalid response: items must be an array");
}
return response.items.length;
```

Use `response.items?.length ?? 0` only when “missing items means zero” is the documented business behavior.

