Generate or accept an `x-request-id` at the HTTP boundary, bind it to the request context with `nestjs-pino`/`AsyncLocalStorage`, and include it in every log line. Propagate the same ID to downstream HTTP/RPC calls and, where supported, database/query telemetry.

Use structured fields rather than string concatenation:

```ts
this.logger.info({ reqId, userId, orderId }, 'Order created');
```

Return the ID in the response so a client can report it. Do not put tokens or sensitive payloads into the correlation fields.

