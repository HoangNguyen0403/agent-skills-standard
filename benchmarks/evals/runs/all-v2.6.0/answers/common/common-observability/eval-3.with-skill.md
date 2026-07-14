# Quick-start example

The following TypeScript-style sketch shows the essential request flow. Adapt the logger and OpenTelemetry SDK setup to the service framework.

```ts
import { context, propagation, trace, SpanStatusCode } from '@opentelemetry/api';
import pino from 'pino';

const logger = pino();
const tracer = trace.getTracer('user-service');

async function handleRequest(req: Request, res: Response) {
  const route = 'GET /users/:id';
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const carrier = Object.fromEntries(req.headers.entries());
  const parent = propagation.extract(context.active(), carrier);

  return context.with(parent, async () => {
    const span = tracer.startSpan(route, { attributes: { 'http.request.method': 'GET' } });
    const started = performance.now();

    try {
      // Execute the handler and instrument downstream calls with child spans.
      const user = await loadUser(req.params.id);
      const durationMs = performance.now() - started;
      span.setAttribute('http.response.status_code', 200);
      logger.info({ requestId, route, statusCode: 200, durationMs }, 'request completed');
      res.status(200).json(user);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      logger.error({ requestId, route, statusCode: 500, errorType: (error as Error).name }, 'request failed');
      res.status(500).json({ error: 'internal_error' });
    } finally {
      span.end();
    }
  });
}
```

In the complete service, configure OpenTelemetry exporters and automatic instrumentation, inject the current context into outbound requests, and expose RED metrics: request count/rate, error count/rate, a latency histogram (p50/p95/p99), and saturation such as worker or connection-pool utilization. Use route templates and bounded metric labels. Add an `X-Request-Id` response header, redact secrets before logging, and create SLO burn-rate alerts rather than raw spike alerts. Test a successful request, a downstream failure, and a timeout to prove correlation, exception recording, metric updates, and span cleanup.
