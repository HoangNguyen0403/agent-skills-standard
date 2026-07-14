Use a multi-stage Dockerfile: install/build with development dependencies, then copy only compiled `dist` and production dependencies into a small runtime image. Run as the non-root `node` user.

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package*.json ./
USER node
CMD ["node", "dist/main.js"]
```

Use a `.dockerignore`, pin dependencies, and avoid copying source, tests, caches, or dev tools into the runtime stage.

