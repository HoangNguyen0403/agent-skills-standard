---
name: nestjs-documentation
description: "Automate Swagger/OpenAPI documentation and standardize API response schemas in NestJS. Use when generating OpenAPI specs, documenting paginated or generic responses, configuring the Nest CLI Swagger plugin, or publishing versioned API docs. (triggers: main.ts, **/*.dto.ts, DocumentBuilder, SwaggerModule, ApiProperty, ApiResponse)"
---

# OpenAPI & Documentation

## Priority: P2 (MAINTENANCE)

Automated API documentation and OpenAPI standards.

## Workflow

1. **Enable the Swagger plugin** in `nest-cli.json` to auto-generate `@ApiProperty` from DTOs.
2. **Annotate controllers** with `@ApiTags`, `@ApiResponse`, and auth decorators.
3. **Create generic wrappers** for paginated and polymorphic responses.
4. **Generate separate docs** for public vs internal audiences.

## Setup

```json
// nest-cli.json — enable Swagger plugin
{
  "compilerOptions": {
    "plugins": ["@nestjs/swagger"]
  }
}
```

```typescript
// main.ts — Swagger bootstrap
const config = new DocumentBuilder()
  .setTitle('API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const doc = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, doc);
```

## Response Documentation

- **Strictness**: Every controller method must have `@ApiResponse({ status: 200, type: UserDto })`.
- **Generic Wrappers**: Define `ApiPaginatedResponse<T>` decorators using `ApiExtraModels` + `getSchemaPath()` to handle generics properly.

## Advanced Patterns

- **Polymorphism**: Use `@ApiExtraModels` and `getSchemaPath` for `oneOf`/`anyOf` union types.
- **File Uploads**: Use `@ApiConsumes('multipart/form-data')` with explicit `@ApiBody` schema.
- **Authentication**: Use `@ApiBearerAuth()` or `@ApiSecurity('api-key')` matching `DocumentBuilder` config.
- **Enums**: Force named enums: `@ApiProperty({ enum: MyEnum, enumName: 'MyEnum' })`.

## Operation Grouping

- **Tags**: Mandatory `@ApiTags('domains')` on every Controller.
- **Multiple Docs**: Generate separate docs for different audiences (Public vs Internal).

```typescript
SwaggerModule.createDocument(app, config, { include: [PublicModule] });  // /api/docs
SwaggerModule.createDocument(app, adminConfig, { include: [AdminModule] }); // /admin/docs
```

## Anti-Patterns

- **No missing @ApiResponse**: Every controller method must declare its response type and status code.
- **No /docs in production**: Disable Swagger in production to prevent API schema exposure.
- **No manual @ApiProperty everywhere**: Use the Nest CLI Swagger plugin to auto-generate from DTOs.
