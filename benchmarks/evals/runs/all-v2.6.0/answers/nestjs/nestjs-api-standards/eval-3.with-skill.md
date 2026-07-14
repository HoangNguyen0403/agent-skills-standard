Use strict page and response DTOs rather than returning an unbounded array. A typical contract is `PageOptionsDto` (`page`, `take`, `order`) plus `PageDto<T>` containing `data` and pagination metadata. Validate and cap `take`, apply deterministic ordering, and use a cursor strategy when offset pagination becomes expensive.

```ts
export class PageOptionsDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) take = 20;
  @IsEnum(Order) order: Order = Order.ASC;
}

export class PageDto<T> {
  constructor(public readonly data: T[], public readonly meta: {
    page: number; take: number; itemCount: number; pageCount: number;
  }) {}
}
```

The service should map entities to response DTOs and return the page metadata. For Swagger generics, register the item and wrapper with `ApiExtraModels` and resolve schemas using `getSchemaPath` in an `ApiPaginatedResponse` decorator.

