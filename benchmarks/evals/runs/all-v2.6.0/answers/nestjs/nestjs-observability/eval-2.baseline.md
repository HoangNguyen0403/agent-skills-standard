Create or accept a correlation/request ID at the edge, reject unsafe values or generate a UUID, and attach it to the response and every log entry for that request. A middleware or interceptor can use `AsyncLocalStorage` to make the ID available to services without passing it through every method.

```ts
const requestId = req.header('x-request-id') ?? randomUUID();
res.setHeader('x-request-id', requestId);
return next.handle().pipe(tap(() => logger.info({ requestId })));
```

Pass the ID explicitly in outbound HTTP/message metadata and propagate it to downstream services. Ensure asynchronous jobs carry a correlation ID in their data/headers. Use structured logging, avoid trusting arbitrary long IDs, and do not confuse a correlation ID with an authentication credential or a distributed trace/span ID.

