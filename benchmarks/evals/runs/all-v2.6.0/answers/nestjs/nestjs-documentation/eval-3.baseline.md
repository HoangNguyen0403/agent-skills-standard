Create two Swagger documents from the same Nest application, selecting routes by module or metadata. With `SwaggerModule.createDocument`, pass `include: [PublicModule]` for the public document and `include: [InternalModule]` for the internal document, or use an `operationIdFactory`/`deepScanRoutes` as needed for the module graph.

```ts
const publicDoc = SwaggerModule.createDocument(app, config, {
  include: [PublicModule],
});
SwaggerModule.setup('docs/public', app, publicDoc);

const internalDoc = SwaggerModule.createDocument(app, config, {
  include: [InternalModule],
});
SwaggerModule.setup('docs/internal', app, internalDoc);
```

If modules cannot cleanly separate the route sets, apply a custom document factory/filter based on controller metadata and ensure related schemas are included. Protect internal docs with authentication/network policy; hiding the UI is not API authorization. Keep tags, security schemes, and versioning explicit in each document.

