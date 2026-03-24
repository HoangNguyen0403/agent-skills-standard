# References

Move large code blocks here.

## Inline Examples

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

```typescript
SwaggerModule.createDocument(app, config, { include: [PublicModule] });  // /api/docs
SwaggerModule.createDocument(app, adminConfig, { include: [AdminModule] }); // /admin/docs
```
