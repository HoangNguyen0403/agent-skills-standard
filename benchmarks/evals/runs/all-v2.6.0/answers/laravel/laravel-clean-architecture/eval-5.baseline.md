Separate the application into delivery, application, domain, and infrastructure concerns:

```text
HTTP/Form Request -> Use Case/Handler -> Domain model + ports -> Infrastructure adapter
```

Controllers should not contain business rules or raw persistence orchestration. Define interfaces for external systems where substitution matters, bind adapters in providers, and keep domain services framework-independent when feasible. Use Eloquent at the infrastructure boundary or deliberately accept its coupling when that is simpler. Add unit tests for domain rules and feature tests for the full HTTP boundary. Apply transactions and outbox/after-commit patterns around side effects as required; clean architecture is a dependency rule, not a mandatory directory template.

