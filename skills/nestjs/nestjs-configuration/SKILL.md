---
name: nestjs-configuration
description: "Environment variables validation and ConfigModule setup. Use when validating environment variables with Joi/Zod or configuring ConfigModule in NestJS. (triggers: .env, app.module.ts, **/config.ts, ConfigModule, Joi, env)"
---

# NestJS Configuration Standards

## **Priority: P1 (OPERATIONAL)**

Environment configuration and validation patterns for NestJS applications.

## Setup

1. **Library**: Use `@nestjs/config`.
2. **Initialization**: Import `ConfigModule.forRoot({ isGlobal: true })` in `AppModule`.

## Validation

- **Mandatory**: Validate environment variables at startup.
- **Tool**: Use `joi` or a custom validation class.
- **Effect**: The app **must crash** immediately if a required env var (e.g., `DB_URL`) is missing.

```typescript
// app.module.ts
ConfigModule.forRoot({
  validationSchema: Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'production')
      .default('development'),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required(),
  }),
});
```

## Usage

- **Injection**: Inject `ConfigService` to access values.
- **Typing**: Avoid magic strings. Use a type-safe getter helper or a dedicated configuration object/interface.
- **Secrets**: Never commit `.env` files. Add `.env*` to `.gitignore`.

## ⚠️ Adding New Variables

When adding a new environment variable to the application, you **MUST** update all of the following:

1. **`src/config/env.validation.ts`**: Add the class property with appropriate `class-validator` decorators.
2. **`.env.example`**: Add a placeholder value so other developers know about it.
3. **`.env.development` / `.env.test`**: Add the actual development values.
4. **CI/CD Pipelines & Infrastructure**: You **MUST** map the new variable in your deployment scripts (e.g., `.github/workflows/*.yml`, `gitlab-ci.yml`, Terraform, or Azure Pipelines). Most modern cloud platforms (Cloud Run, ECS, Kubernetes) require explicit mapping of secrets/env-vars into the container runtime. Failure to do this will cause the production deployment to crash or silently fail.


## Anti-Patterns

- **No unchecked env vars**: Validate all required variables at startup; app must crash if missing.
- **No committed secrets**: Add `.env*` to `.gitignore`; load values via ConfigService only.
- **No new vars without CI/CD update**: Always update `env.validation.ts`, `.env.example`, and pipeline manifests.
