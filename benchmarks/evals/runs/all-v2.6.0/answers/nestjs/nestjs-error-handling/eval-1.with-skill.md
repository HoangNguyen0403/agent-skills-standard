Implement a strictly typed global filter and use `HttpAdapterHost` so it works with Express or Fastify without importing platform-specific request/response types.

```ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.adapterHost;
    const ctx = host.switchToHttp();
    const status = exception instanceof HttpException
      ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = { statusCode: status, message: 'Request failed', error: 'Error',
      timestamp: new Date().toISOString(), path: httpAdapter.getRequestUrl(ctx.getRequest()) };
    httpAdapter.reply(ctx.getResponse(), response, status);
  }
}
app.useGlobalFilters(app.get(GlobalExceptionFilter));
```

Let services throw domain errors, map low-level errors to HTTP exceptions in an interceptor, and let the filter only format/log the final response.

