Create reusable Swagger decorators that compose `ApiProperty` options and any common metadata, then apply them to DTOs. For example:

```ts
export const ApiId = () => ApiProperty({ type: String, format: 'uuid' });
export const ApiPageSize = () =>
  ApiProperty({ type: Number, minimum: 1, maximum: 100, default: 20 });
```

For a larger DTO set, use the Nest Swagger mapped types (`PartialType`, `PickType`, `OmitType`, `IntersectionType`) and a shared base class. Keep validation decorators and Swagger metadata together where that is clear, but do not rely on TypeScript types alone because runtime reflection cannot represent every union/generic/array shape. Use `@ApiExtraModels` for referenced classes and `@ApiHideProperty` for internal fields. Confirm the generated document in CI so refactors do not silently remove schemas.

