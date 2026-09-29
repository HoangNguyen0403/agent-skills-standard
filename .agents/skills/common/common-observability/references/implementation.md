# Implementation Examples

## Structured Logger Setup (Node.js / Pino)

```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  mixin() {
    return { service: "order-api" };
  },
});

// Attach correlation ID per request
app.use((req, res, next) => {
  req.log = logger.child({ traceId: req.headers["x-request-id"] });
  next();
});
```
