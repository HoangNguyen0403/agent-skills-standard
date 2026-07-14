Expose a Prometheus scrape endpoint such as `/metrics` with `@willsoto/nestjs-prometheus`, and register counters/histograms for request totals, errors, and latency. Keep labels bounded; never label by arbitrary user IDs or URLs.

Also add Terminus health checks with separate liveness and readiness semantics. Liveness answers whether the process is alive; readiness checks dependencies such as PostgreSQL/Redis and can fail when heap is unsafe. Scrape `/metrics` from Prometheus and protect or isolate it if it contains operationally sensitive information.

