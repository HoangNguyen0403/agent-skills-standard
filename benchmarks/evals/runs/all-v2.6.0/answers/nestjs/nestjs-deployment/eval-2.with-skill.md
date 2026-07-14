Set V8 old-space to roughly 75–80% of the Kubernetes memory limit, leaving room for native memory and the runtime. For a 1 GiB limit, an initial value is about 800 MiB:

```yaml
containers:
  - name: api
    resources:
      limits: { memory: 1Gi }
    command: ["node"]
    args: ["--max-old-space-size=800", "dist/main.js"]
```

Tune from heap/OOM metrics rather than assuming the limit equals usable V8 heap. Set requests appropriately, define liveness/readiness probes, and keep graceful shutdown enabled so pods drain cleanly.

