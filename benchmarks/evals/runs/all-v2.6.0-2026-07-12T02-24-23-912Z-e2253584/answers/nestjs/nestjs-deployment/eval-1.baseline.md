Use a multi-stage Dockerfile and copy only production runtime artifacts:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/main.js"]
```

Use a `.dockerignore` for VCS files, tests, local dependencies, logs, and build output; pin a suitable base image/digest, keep dependencies production-only, and run as non-root. Measure image layers rather than removing files blindly, and ensure native modules are built for the runtime image. Never bake secrets into layers.

