Throw `RpcException` from an RPC handler or translate domain/infrastructure errors at the microservice boundary. Add an RPC exception filter when the service needs a consistent error envelope and logging:

```ts
@Catch()
export class RpcErrorFilter implements RpcExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const rpc = host.switchToRpc();
    // log correlation id and map error to a safe RpcException payload
    return throwError(() => new RpcException({ code: 'INTERNAL', message: 'Request failed' }));
  }
}
```

For TCP/RPC transports, return/throw the framework’s observable-compatible error form and make clients handle timeouts, unavailable services, and retryable versus permanent codes. Do not expose stack traces or database details. Add correlation metadata, bounded retries with backoff and idempotency for commands, deadlines, circuit breaking, and a dead-letter/recovery path for asynchronous messages. Confirm the exact error mapping for the selected Nest transport and client library.

