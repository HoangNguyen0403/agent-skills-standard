Set the V8 heap limit on the Node process, while also sizing the pod/container memory correctly:

```yaml
env:
  - name: NODE_OPTIONS
    value: "--max-old-space-size=768"
resources:
  requests:
    memory: "512Mi"
  limits:
    memory: "1Gi"
```

`--max-old-space-size` is in MiB and should leave room below the container limit for native memory, buffers, the runtime, and sidecars; it is not a replacement for a pod limit. Set it in the Deployment or command/args, not only in a developer shell. Monitor heap and RSS, tune based on workload, and make OOM behavior visible. Use a rolling update and appropriate probes so a memory change can be safely observed.

