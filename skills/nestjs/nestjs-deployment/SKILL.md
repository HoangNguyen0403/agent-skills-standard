---
name: nestjs-deployment
description: Containerize NestJS apps with multi-stage Docker builds, tune Node.js memory, and implement graceful shutdown hooks. Use when writing Dockerfiles, configuring K8s deployments, or adding shutdown hooks for NestJS.
metadata:
  triggers:
    files:
    - 'k8s/**'
    - 'helm/**'
    keywords:
    - Dockerfile
    - max-old-space-size
    - shutdown hooks
---
# Deployment & Ops Standards

## **Priority: P1 (OPERATIONAL)**


## Workflow: Containerize NestJS App

1. **Write multi-stage Dockerfile** — Build stage installs devDeps and runs `nest build`; run stage copies only `dist` and pruned `node_modules`.
2. **Set non-root user** — Add `USER node` to Dockerfile.
3. **Tune memory** — Set `--max-old-space-size` to ~75% of container memory limit.
4. **Enable shutdown hooks** — Call `app.enableShutdownHooks()` in `main.ts`.
5. **Add K8s pre-stop** — Configure 5-10s sleep pre-stop hook for LB draining.

## Dockerfile Example

See [implementation examples](references/example.md)

## Runtime Tuning (Node.js)

- **Memory Config**: Container memory != Node memory.
 - **Rule**: Explicitly set Max Old Space.
 - **Command**: `node --max-old-space-size=XXX dist/main`
 - **Calculation**: Set to ~75-80% of Kubernetes Limit. (Limit: 1GB -> OldSpace: 800MB).
- **Graceful Shutdown**:
 - **Signal**: Listen to `SIGTERM`.
 - **NestJS**: `app.enableShutdownHooks()` mandatory.
 - **Sleep**: Add "Pre-Stop" sleep in K8s (5-10s) to allow Load Balancer to drain connections before Node process stops accepting traffic.

## Init Patterns

- **Database Migrations**:
 - **Anti-Pattern**: Running migration in `main.ts` on startup.
 - **Pro Pattern**: Use **Init Container** in Kubernetes that runs `npm run typeorm:migration:run` before app container starts.

## Environment Variables & CI/CD

- **CI/CD Pipelines (GitHub, GitLab, Azure, etc.)**:
 - If you modify `src/config/env.validation.ts` to add new environment variable, you **MUST** map it explicitly in your deployment pipeline/infrastructure-as-code.
 - **Platform Context**:
 - **Cloud Run/ECS**: Variables must explicitly passed in service definition.
 - **Kubernetes**: New variables must added to `Deployment` manifest or `ConfigMap`/`Secret`.
 - **Lambda/Serverless**: Must added to `serverless.yml` or provider console.
 - **Fundamental Rule**: Application code configuration changes "breaking changes" for infrastructure layer. Never assume environment inheritance.


## Anti-Patterns

- **No migrations in main.ts**: Use K8s Init Containers or pre-deploy CI steps for migration runs.
- **No root user in Docker**: Always add `USER node` to Dockerfile; running as root security risk.
- **No unbounded Node heap**: Set `--max-old-space-size` to ~75% of container memory limit.