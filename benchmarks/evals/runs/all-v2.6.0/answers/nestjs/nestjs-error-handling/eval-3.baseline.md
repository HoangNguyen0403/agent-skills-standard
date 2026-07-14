Do not send exception objects or stack traces directly in production responses. Configure a global exception filter that logs the full error server-side with a request/correlation ID, but returns a stable generic message for 5xx errors. For expected 4xx errors, return only deliberately safe validation or domain details.

```ts
const message = status >= 500 ? 'Internal server error' : safeClientMessage(exception);
response.status(status).json({ statusCode: status, message, requestId });
```

Set `NODE_ENV` from validated configuration rather than trusting a request, disable verbose framework error output and debug endpoints in production, and sanitize logger sinks because logs can be exposed too. Add tests asserting that a thrown error response contains no `stack`, SQL, filesystem paths, tokens, or internal messages. Keep stack traces in access-controlled logs and error tracking.

