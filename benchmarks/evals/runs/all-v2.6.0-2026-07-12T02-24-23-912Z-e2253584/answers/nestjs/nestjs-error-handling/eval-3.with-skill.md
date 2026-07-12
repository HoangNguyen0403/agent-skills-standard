Never include stack traces, internal file paths, SQL, or raw variable dumps in production HTTP responses. In the global filter, return a stable sanitized error contract and log the full exception server-side with the class context.

```ts
const message = process.env.NODE_ENV === 'production'
  ? 'Internal server error'
  : exception instanceof Error ? exception.message : 'Request failed';
const stack = process.env.NODE_ENV === 'production' ? undefined : exception instanceof Error ? exception.stack : undefined;
```

Prefer a generic public message for unexpected 500s while preserving the correlation ID for support. Use `HttpAdapterHost` for platform-neutral response handling and keep business error interpretation outside the filter.

