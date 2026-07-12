Define a generic response DTO and explicitly describe the concrete item schema with `ApiExtraModels` and `ApiOkResponse`:

```ts
export class PageDto<T> {
  data!: T[];
  meta!: { page: number; limit: number; total: number };
}

export const ApiPaginated = <TModel extends Type<unknown>>(model: TModel) =>
  applyDecorators(
    ApiExtraModels(PageDto, model),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PageDto) },
          { properties: { data: { type: 'array', items: { $ref: getSchemaPath(model) } } } },
        ],
      },
    }),
  );
```

Apply `@ApiPaginated(UserDto)` on the route. The exact schema can also be written inline with `type: 'array'` and `items`. Generics disappear at runtime, so registering the concrete model and setting `$ref` explicitly is necessary. Inspect `/api-json` or generated OpenAPI output to verify the result.

