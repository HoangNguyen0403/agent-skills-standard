Enable the Nest CLI Swagger plugin so DTO metadata is generated from TypeScript types and validation decorators instead of adding `@ApiProperty()` to every field.

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "@nestjs/swagger" }]
  }
}
```

Still annotate controllers with `@ApiTags`, exact `@ApiResponse({ status, type })`, and auth decorators. Use named enums and explicit decorators where the plugin cannot infer a union, generic, or runtime-only shape. Disable `/docs` in production unless it is deliberately protected.

