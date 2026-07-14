Initialize `@nestjs/config` globally and give it a startup validation schema. Required variables should make boot fail immediately instead of producing a partially configured service.

```ts
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production').default('development'),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required(),
  }),
});
```

Inject `ConfigService` into modules and services, preferably through a typed configuration object or getter. Never read `process.env` throughout business code, and never commit `.env` secrets.

