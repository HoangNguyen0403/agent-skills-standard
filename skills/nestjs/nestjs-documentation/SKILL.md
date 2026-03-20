---
name: nestjs-documentation
description: "Swagger automation and Generic response documentation. Use when generating OpenAPI/Swagger documentation or documenting NestJS API responses. (triggers: main.ts, **/*.dto.ts, DocumentBuilder, SwaggerModule, ApiProperty, ApiResponse)"
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

## Anti-Patterns

- **No missing @ApiResponse**: Every controller method must declare its response type and status code.
- **No /docs in production**: Disable Swagger in production to prevent API schema exposure.
- **No manual @ApiProperty everywhere**: Use the Nest CLI Swagger plugin to auto-generate from DTOs.
