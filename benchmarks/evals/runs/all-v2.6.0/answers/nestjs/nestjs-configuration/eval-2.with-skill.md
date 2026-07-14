Update the application validation model and every runtime contract, not just the local `.env` file:

- add the variable and its type/required rule to `src/config/env.validation.ts` (or the Joi schema);
- document a placeholder in `.env.example` and add appropriate development/test values;
- map it explicitly in CI/CD and infrastructure, such as Kubernetes `ConfigMap`/`Secret`, ECS/Cloud Run settings, or pipeline variables;
- consume it through `ConfigService` or a typed configuration layer.

The deployment environment does not automatically inherit a developer's `.env`, so omitting the infrastructure mapping can make production fail or silently use an unintended default.

