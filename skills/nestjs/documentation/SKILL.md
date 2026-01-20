---
name: NestJS OpenAPI
description: Swagger automation and Generic response documentation.
metadata:
  labels: [nestjs, swagger, openapi, docs]
  triggers:
    files: ['main.ts', '**/*.dto.ts']
    keywords: [DocumentBuilder, SwaggerModule, ApiProperty, ApiResponse]
---

# OpenAPI & Documentation

## **Priority: P2 (MAINTENANCE)**

Automated API documentation and OpenAPI standards.

- **Automation**: **ALWAYS** use the Nest CLI Plugin (`@nestjs/swagger/plugin`).
  - **Benefit**: Auto-generates `@ApiProperty` for DTOs and response types. Reduces boilerplate by 50%.
  - **Config**: `nest-cli.json` -> `"plugins": ["@nestjs/swagger"]`.
- **Versioning**: Maintain separate Swagger docs for `v1`, `v2` if breaking changes occur.

## Response Documentation

- **Strictness**: Every controller method must have `@ApiResponse({ status: 200, type: UserDto })`.
- **Generic Wrappers**: Define `ApiPaginatedResponse<T>` decorators to document generic `PageDto<T>` returns properly (Swagger doesn't handle generics well by default).
  - **Technique**: Use `ApiExtraModels` + `getSchemaPath()` in the custom decorator to handle the generic `T` ref.

## Advanced Patterns

- **Polymorphism**: Use `@ApiExtraModels` and `getSchemaPath` for `oneOf`/`anyOf` union types.
- **File Uploads**: Document `multipart/form-data` explicitly.
  - **Decorator**: `@ApiConsumes('multipart/form-data')`.
  - **Body**: `@ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })`.
- **Authentication**: Specify granular security schemes per route/controller.
  - **Types**: `@ApiBearerAuth()` or `@ApiSecurity('api-key')` (Must match `DocumentBuilder().addBearerAuth()`).
- **Enums**: Force named enums for reusable schema references.
  - **Code**: `@ApiProperty({ enum: MyEnum, enumName: 'MyEnum' })`.

## Operation Grouping

- **Tags**: Mandatory `@ApiTags('domains')` on every Controller to group endpoints logically.
- **Multiple Docs**: generate separate docs for different audiences (e.g. Public vs Internal).

  ```typescript
  SwaggerModule.createDocument(app, config, { include: [PublicModule] }); // /api/docs
  SwaggerModule.createDocument(app, adminConfig, { include: [AdminModule] }); // /admin/docs
  ```

## Self-Documentation

- **Compodoc**: Use `@compodoc/compodoc` to generate static documentation of the module graph, services, and dependencies.
  - **Use Case**: New developer onboarding and architectural review.

## Advanced OpenAPI

- **Polymorphism**: Use `@ApiExtraModels` and `getSchemaPath` for `oneOf`/`anyOf` union types.
  - **Pattern**: Register generic/sub-types in controller, refer via schema `$ref`.
- **File Uploads**: Document `multipart/form-data` explicitly.
  - **Decorator**: `@ApiConsumes('multipart/form-data')`.
  - **Body**: `@ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })`.
- **Authentication**: Specify granular security schemes per route/controller.
  - **Types**: `@ApiBearerAuth()` or `@ApiSecurity('api-key')`. Match setup in `DocumentBuilder`.
- **Enums**: Force named enums for reusable schema references.
  - **Code**: `@ApiProperty({ enum: MyEnum, enumName: 'MyEnum' })`.
- **Grouping**: Segregate public vs. internal docs.
  - **Setup**: `SwaggerModule.createDocument(app, config, { include: [AdminModule] })`.
