# Observability Data Formats

## Logging Schema
Must include: `timestamp` (ISO 8601), `level`, `service`, `traceId`, `spanId`, `message`.

## Metrics
`<service>_<noun>_<unit>` (e.g., `api_request_duration_ms`).
