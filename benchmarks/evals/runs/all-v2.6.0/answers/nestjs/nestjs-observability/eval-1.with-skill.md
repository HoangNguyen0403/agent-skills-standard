Use `nestjs-pino` for high-throughput structured JSON logging. It integrates with Nest's logger and can attach request context, unlike scattered `console.log` calls.

Configure it at bootstrap/module level, use a class context such as `new Logger(MyService.name)`, and emit structured fields for identifiers and outcomes. Include redaction for secrets and tokens, and choose `error` for 5xx failures versus `warn` for client errors. Keep performance benchmark headers behind a development feature flag.

