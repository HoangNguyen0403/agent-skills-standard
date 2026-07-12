# REST API versioning

Choose one consistent strategy: URI paths such as `/api/v1/orders`, a version header, or a vendor media type. URI versioning is often easiest for public APIs; headers keep URLs stable but are less visible to clients and caches.

Keep supported contracts backward compatible, prefer additive changes, and route each version through an explicit controller or adapter. Publish an OpenAPI document and changelog per version, define deprecation and removal dates, and test compatibility. Do not silently change field meaning, status codes, pagination, or error semantics. Share application services when behavior is common, but isolate version-specific mapping and validation.



