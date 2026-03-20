---
name: nestjs-deployment
description: "Docker builds, Memory tuning, and Graceful shutdown. Use when containerizing NestJS apps, tuning memory, or implementing graceful shutdown. (triggers: Dockerfile, k8s/**, helm/**, Dockerfile, max-old-space-size, shutdown hooks)"
---

# Deployment & Ops Standards

## **Priority: P1 (OPERATIONAL)**

Docker optimization and production deployment standards for NestJS applications.

## Docker Optimization

- **Multi-Stage Builds**: Mandatory.
  1. **Build Stage**: Install `devDependencies`, build NestJS (`nest build`).
  2. **Run Stage**: Copy only `dist` and `node_modules` (pruned), use `node:alpine`.
- **Security**: Do not run as `root`.
  - **Dockerfile**: `USER node`.

## Runtime Tuning (Node.js)

- **Memory Config**: Container memory != Node memory.
  - **Rule**: Explicitly set Max Old Space.
  - **Command**: `node --max-old-space-size=XXX dist/main`
  - **Calculation**: Set to ~75-80% of Kubernetes Limit. (Limit: 1GB -> OldSpace: 800MB).
- **Graceful Shutdown**:
  - **Signal**: Listen to `SIGTERM`.
  - **NestJS**: `app.enableShutdownHooks()` is mandatory.
  - **Sleep**: Add a "Pre-Stop" sleep in K8s (5-10s) to allow Load Balancer to drain connections before Node process stops accepting traffic.

## Init Patterns

- **Database Migrations**:
  - **Anti-Pattern**: Running migration in `main.ts` on startup.
  - **Pro Pattern**: Use an **Init Container** in Kubernetes that runs `npm run typeorm:migration:run` before the app container starts.

## Environment Variables & CI/CD

- **CI/CD Pipelines (GitHub, GitLab, Azure, etc.)**:
  - If you modify `src/config/env.validation.ts` to add a new environment variable, you **MUST** map it explicitly in your deployment pipeline/infrastructure-as-code.
  - **Platform Context**:
    - **Cloud Run/ECS**: Variables must be explicitly passed in the service definition.
    - **Kubernetes**: New variables must be added to the `Deployment` manifest or `ConfigMap`/`Secret`.
    - **Lambda/Serverless**: Must be added to `serverless.yml` or provider console.
  - **Fundamental Rule**: Application code configuration changes are "breaking changes" for the infrastructure layer. Never assume environment inheritance.


## Anti-Patterns

- **No migrations in main.ts**: Use K8s Init Containers or pre-deploy CI steps for migration runs.
- **No root user in Docker**: Always add `USER node` to Dockerfile; running as root is a security risk.
- **No unbounded Node heap**: Set `--max-old-space-size` to ~75% of container memory limit.
