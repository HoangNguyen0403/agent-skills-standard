# Next.js Tooling Reference

## Turbo & CI Configuration

```json
// package.json
"scripts": {
  "dev": "next dev --turbo",
  "lint": "next lint",
  "build": "next build"
}
```

## Self-Hosting (Docker)

```dockerfile
# Dockerfile snippet
FROM node:18-alpine AS base
# ... install & build
CMD ["node", "server.js"]
```
