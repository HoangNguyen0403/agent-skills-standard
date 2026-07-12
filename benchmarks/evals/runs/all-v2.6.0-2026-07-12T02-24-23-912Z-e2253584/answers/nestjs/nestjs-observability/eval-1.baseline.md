Use Nest’s `Logger` abstraction for simple applications, or replace it with a structured logger such as Pino through `nestjs-pino` when production log volume and queryability matter. Configure one logger at bootstrap and inject/use it consistently; do not mix ad hoc `console.log` calls with unrelated formats.

Emit structured JSON fields such as timestamp, level, service, environment, request ID, route, status, duration, and error code. Redact authorization headers, cookies, secrets, and personal data. Choose log levels deliberately, sample noisy success logs, and ship logs to a centralized system. Logging is only one signal: pair it with metrics and traces, and test that exceptions are logged with their cause without exposing sensitive data.

