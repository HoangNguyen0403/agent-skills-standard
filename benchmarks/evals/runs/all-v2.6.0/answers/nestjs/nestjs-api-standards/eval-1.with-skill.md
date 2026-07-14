Use dedicated response DTOs and apply a global interceptor that maps successful results to a stable envelope such as `{ statusCode, data, meta }`. Map entities to DTOs with `plainToInstance` so internal fields never leak, and document every endpoint with its exact `@ApiResponse({ status, type })`. Standardize errors with an `ApiErrorResponse` containing `statusCode`, `message`, `error`, `timestamp`, and `path`.

```ts
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { statusCode: number; data: T }> {
  intercept(context: ExecutionContext, next: CallHandler<T>) {
    return next.handle().pipe(
      map((data) => ({ statusCode: context.switchToHttp().getResponse().statusCode, data })),
    );
  }
}

app.useGlobalInterceptors(new TransformInterceptor());
```

Do not return raw ORM entities or use generic 200 documentation.

