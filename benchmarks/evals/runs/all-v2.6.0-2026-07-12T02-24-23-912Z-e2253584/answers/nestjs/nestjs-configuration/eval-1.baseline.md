Use `@nestjs/config` with a schema or validation function and fail startup when required values are absent or malformed. A Joi example is:

```ts
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
    PORT: Joi.number().port().default(3000),
    DATABASE_URL: Joi.string().uri().required(),
  }),
  validationOptions: { allowUnknown: false, abortEarly: false },
});
```

Alternatively use `validate: (config) => ...` with `class-transformer`/`class-validator`. Keep secrets out of logs and source control, provide a safe example env file, and validate deployment configuration before the process starts. Read values through `ConfigService`, not raw environment access throughout the application.

