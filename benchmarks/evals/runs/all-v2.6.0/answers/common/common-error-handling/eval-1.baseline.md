Assuming an HTTP controller, never expose the raw Postgres error. Log it server-side with a request/correlation ID, then return a generic response:

```ts
try {
  // database operation
} catch (error) {
  logger.error({ err: error, requestId }, 'Database operation failed');

  return res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred.',
    requestId,
  });
}
```

Map only known, safe database conditions to client responses—for example, a unique-constraint violation to `409 Conflict`. Keep Postgres details, SQL, table names, and stack traces out of the response.
