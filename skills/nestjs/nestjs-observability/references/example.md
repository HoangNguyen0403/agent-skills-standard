# References

Move large code blocks here.

## Inline Examples

```typescript
// app.module.ts — Pino setup with redaction
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' } : undefined,
        redact: ['req.headers.authorization', 'body.password', 'body.token'],
      },
    }),
  ],
})
export class AppModule {}
```

```typescript
// metrics.module.ts — key metric definitions
import { makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';

const providers = [
  makeHistogramProvider({ name: 'http_request_duration_seconds', help: 'HTTP latency', labelNames: ['method', 'route', 'status'] }),
  makeHistogramProvider({ name: 'db_query_duration_seconds', help: 'DB query latency', labelNames: ['operation'] }),
  makeGaugeProvider({ name: 'memory_usage_bytes', help: 'Heap memory usage' }),
];
```
