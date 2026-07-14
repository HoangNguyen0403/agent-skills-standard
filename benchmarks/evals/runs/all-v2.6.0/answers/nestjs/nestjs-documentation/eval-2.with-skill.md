Generics are erased at runtime, so register both the wrapper and item DTO with `ApiExtraModels`, then describe the array schema with `getSchemaPath`.

```ts
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(model: TModel) =>
  applyDecorators(
    ApiExtraModels(PageDto, model),
    ApiResponse({
      status: 200,
      schema: {
        allOf: [
          { $ref: getSchemaPath(PageDto) },
          { properties: { data: { type: 'array', items: { $ref: getSchemaPath(model) } } } },
        ],
      },
    }),
  );
```

Use it as `@ApiPaginatedResponse(UserDto)` and document the exact status/type for the endpoint. Keep the runtime response contract aligned with the DTO.

