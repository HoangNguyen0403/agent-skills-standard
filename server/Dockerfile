# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration and lockfile
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY server/package.json ./server/

# Install dependencies (utilizing workspace caching)
RUN pnpm install --filter ./server

# Copy server source
COPY server/ ./server/

# Build the server
WORKDIR /app/server
RUN pnpm build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install pnpm for production deps
RUN npm install -g pnpm

# Copy workspace config and built assets
COPY --from=builder /app/pnpm-lock.yaml /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist

# Install production dependencies only
RUN pnpm install --prod --filter ./server

# Enforce dynamic port for Cloud environments
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "node server/dist/main.js"]
