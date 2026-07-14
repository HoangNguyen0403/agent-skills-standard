Use a multi-stage Docker build and Next's standalone output so the runtime image contains only production dependencies and the traced server files:

```js
// next.config.js
module.exports = { output: 'standalone' };
```

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

Add a `.dockerignore`, pin a compatible Node version, pass runtime secrets through the deployment platform rather than baking them into layers, and add a health check/ graceful shutdown strategy. Test the image as the non-root user and verify static assets, server actions, image optimization, and runtime environment behavior.

