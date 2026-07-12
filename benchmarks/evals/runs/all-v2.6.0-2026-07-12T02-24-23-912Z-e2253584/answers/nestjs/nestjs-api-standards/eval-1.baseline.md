Use a consistent envelope for successful and failed responses, for example:

```ts
type ApiResponse<T> = {
  data: T;
  meta?: { requestId?: string; page?: number; pageSize?: number; total?: number };
};
```

Return DTOs from controllers rather than database entities, and use an interceptor to wrap successful results if that convention applies to every endpoint:

```ts
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_: ExecutionContext, next: CallHandler<T>) {
    return next.handle().pipe(map(data => ({ data })));
  }
}
```

Register it globally with `app.useGlobalInterceptors(new ResponseInterceptor())`, or provide it with `APP_INTERCEPTOR`. Use a global exception filter for the error shape, including status, stable application error code, message, request ID, and optional validation details. Keep HTTP status semantics consistent, document the envelope in Swagger, and avoid wrapping streaming/file responses or already-shaped responses twice.

