Build separate Swagger documents from the same application by selecting controllers/modules for each audience and mounting them at different routes. For example, create a public document with public modules and an internal document with internal modules, then call `SwaggerModule.setup('docs/public', app, publicDoc)` and `SwaggerModule.setup('docs/internal', app, internalDoc)`.

Give each document its own title/version and security scheme. Protect internal docs with network/auth controls and disable all docs in production unless intentionally exposed. Keep response DTOs and `@ApiResponse` declarations exact in both documents; do not rely on a generic 200 schema.

