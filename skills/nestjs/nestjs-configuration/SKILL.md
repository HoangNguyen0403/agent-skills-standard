---
name: nestjs-configuration
description: Environment variables validation and ConfigModule setup. Use when validating environment variables with Joi/Zod or configuring ConfigModule in NestJS.
metadata:
  triggers:
    files:
    - '.env'
    - 'app.module.ts'
    - '**/config.ts'
    keywords:
    - ConfigModule
    - Joi
    - env
---
# NestJS Configuration Standards

## **Priority: P1 (OPERATIONAL)**


## Setup

1. **Library**: Use `@nestjs/config`.
2. **Initialization**: Import `ConfigModule.forRoot({ isGlobal: true })` in `AppModule`.

## Validation

- **Mandatory**: Validate environment variables at startup.
- **Tool**: Use `joi` or custom validation class.
- **Effect**: app **must crash** immediately if required env var (e.g., `DB_URL`) missing.

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
- **Typing**: Avoid magic strings. Use type-safe getter helper or dedicated configuration object/interface.
- **Secrets**: Never commit `.env` files. Add `.env*` to `.gitignore`.

## ⚠️ Adding New Variables

When adding new environment variable to application, you **MUST** update all of following:

1. **`src/config/env.validation.ts`**: Add class property with appropriate `class-validator` decorators.
2. **`.env.example`**: Add placeholder value so other developers know about it.
3. **`.env.development` / `.env.test`**: Add actual development values.
4. **CI/CD Pipelines & Infrastructure**: You **MUST** map new variable in your deployment scripts (e.g., `.github/workflows/*.yml`, `gitlab-ci.yml`, Terraform, or Azure Pipelines). Most modern cloud platforms (Cloud Run, ECS, Kubernetes) require explicit mapping of secrets/env-vars into container runtime. Failure to this will cause production deployment to crash or silently fail.


## Anti-Patterns

- **No unchecked env vars**: Validate all required variables at startup; app must crash if missing.
- **No committed secrets**: Add `.env*` to `.gitignore`; load values via ConfigService only.
- **No new vars without CI/CD update**: Always update `env.validation.ts`, `.env.example`, and pipeline manifests.