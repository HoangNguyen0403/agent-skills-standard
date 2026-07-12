# Clean Architecture structure

Keep dependencies pointing inward:

```text
domain/          entities, value objects, domain services
application/     use cases and ports
adapters/in/     REST controllers, message consumers
adapters/out/    repositories and external clients
infrastructure/  Spring configuration and wiring
```

The domain should not depend on Spring, HTTP, JPA, or vendor SDKs. Application services implement use cases and depend on outbound ports. Inbound adapters translate requests into commands and map results to DTOs; outbound adapters implement ports. Keep Spring annotations at the edges, enforce package boundaries with conventions or ArchUnit, and use this structure proportionally rather than creating layers that only rename pass-through code.



