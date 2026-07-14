Register a global `ValidationPipe` during bootstrap:

```ts
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  validationError: { target: false, value: false },
}));
```

`transform` converts primitive route/query values when DTO metadata supports it, `whitelist` strips properties without decorators, and `forbidNonWhitelisted` rejects them instead. Add `@Type(() => Number)`/`@Type(() => Boolean)` where needed and decorate every expected field. Provide an `exceptionFactory` if the API needs a stable validation-error format. Keep validation DTOs separate from entities and test malformed body, query, and path input.

