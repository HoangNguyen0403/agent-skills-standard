Expose a dedicated unauthenticated or protected `/metrics` endpoint that returns Prometheus text format. A common approach is `prom-client` with a `Registry`, default process metrics, and counters/histograms for HTTP requests, latency, status, and application operations:

```ts
@Controller('metrics')
export class MetricsController {
  @Get()
  async metrics(@Res() res: Response) {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}
```

Use a `@Global` metrics module or an interceptor to observe requests, register collectors once per process, and avoid high-cardinality labels such as user ID or raw URL. Configure Prometheus to scrape each pod, protect the endpoint if necessary, and expose health/readiness separately. Add alerts and dashboards for latency, errors, saturation, queue depth, and event-loop lag.

