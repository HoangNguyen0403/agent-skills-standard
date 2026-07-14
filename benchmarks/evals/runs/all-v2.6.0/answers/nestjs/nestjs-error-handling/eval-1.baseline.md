Implement `ExceptionFilter<unknown>` and register it globally. Handle `HttpException` separately, preserve its status and safe response, and map unknown errors to a generic 500 response:

```ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = status >= 500 ? 'Internal server error' : this.safeMessage(exception);
    this.logger.error({ exception, path: request.url });
    response.status(status).json({ statusCode: status, message, path: request.url });
  }
}
```

Register with `app.useGlobalFilters(new GlobalExceptionFilter(logger))` or `APP_FILTER`. Add request IDs, structured logging, validation-error normalization, and transport-specific handling where needed. Never serialize raw unknown exceptions or secrets.

