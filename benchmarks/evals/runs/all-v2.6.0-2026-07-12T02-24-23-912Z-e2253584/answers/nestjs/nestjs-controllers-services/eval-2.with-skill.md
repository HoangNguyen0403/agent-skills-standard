Register one global `ValidationPipe` at bootstrap:

```ts
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
}));
```

Use DTO classes with `class-validator` decorators. `transform` instantiates DTOs and converts primitives, `whitelist` strips properties without decorators, and `forbidNonWhitelisted` rejects unexpected input instead of silently accepting it. Apply `ParseIntPipe` or `ParseUUIDPipe` to route IDs, and use `@ValidateNested()` plus `@Type()` for nested DTOs.

