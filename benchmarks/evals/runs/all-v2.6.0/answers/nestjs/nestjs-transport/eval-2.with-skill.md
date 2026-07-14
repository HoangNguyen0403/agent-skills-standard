Use transport-specific `RpcException` and a global RPC exception filter; an HTTP `HttpException` does not preserve the intended error contract over TCP/RPC.

```ts
throw new RpcException({ code: 'ORDER_NOT_FOUND', message: 'Order not found' });
```

The filter should map the error to a stable microservice response and log it with a correlation ID. Configure `ValidationPipe({ transform: true })` in the `MicroserviceOptions` bootstrap, not only in the HTTP app. Keep business errors transport-neutral and translate them at the adapter boundary.

