# NestJS API Standards Patterns

## Generic Response & Pagination

This reference implements the standard `PageDto`, `PageMetaDto`, and the `ApiPaginatedResponse` decorator for Swagger.

### Page Options DTO

Standard query parameters for list endpoints.

```typescript
// dtos/page-options.dto.ts
export class PageOptionsDto {
  @ApiPropertyOptional({ enum: Order, default: Order.ASC })
  @IsEnum(Order)
  @IsOptional()
  readonly order?: Order = Order.ASC;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  readonly page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  readonly take?: number = 10;

  get skip(): number {
    return (this.page - 1) * this.take;
  }
}
```

### Page DTO

Generic wrapper for paginated data.

```typescript
// dtos/page.dto.ts
export class PageDto<T> {
  @ApiProperty({ isArray: true })
  readonly data: T[];

  @ApiProperty({ type: () => PageMetaDto })
  readonly meta: PageMetaDto;

  constructor(data: T[], meta: PageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
```

### Swagger Decorator

Magical decorator to expose `PageDto<UserDto>` correctly in Swagger UI.

```typescript
// decorators/api-paginated-response.decorator.ts
export const ApiPaginatedResponse = <TModel extends Type<any>>(
  model: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(PageDto, model),
    ApiOkResponse({
      description: 'Successfully received model list',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PageDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
};
```
