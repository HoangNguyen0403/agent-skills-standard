# NestJS controller architecture audit

The concern is valid, but it cannot be confirmed from the prompt alone. The audit should establish whether controllers are transport adapters or whether they own application and persistence decisions.

Start with the skill’s backend leakage check:

```bash
rg -n 'Repository\.|Query\.|db\.' src/controllers -g '*.ts'
```

Then inspect every controller method for:

- direct repository, ORM, query-builder, transaction, filesystem, queue, or third-party-client access;
- business rules such as pricing, eligibility, permissions, state transitions, or invariant checks;
- loops and multi-step orchestration over domain objects;
- construction or mutation of domain entities;
- duplicated error/status mapping and untested edge-case handling.

The static search is only a signal: also inspect injected dependencies, conditionals, and calls to infrastructure through helper functions. Guards, pipes, DTO validation, route metadata, authentication policy wiring, and HTTP response formatting are appropriate controller responsibilities. A controller should generally follow:

`Controller -> application service/use case -> domain service/entity -> repository or integration port -> infrastructure adapter`

The controller should pass a validated command/query to one focused application operation. Domain services or entities should own business invariants; repositories and external clients should stay behind the application/domain boundary where that matches the project’s existing architecture. Database-specific transformation logic should not leak into domain objects; use a mapper or adapter instead.

Prioritize controllers with many injected repositories/clients, large branch trees, transactions in route methods, or business logic duplicated across endpoints. Record the exact file, method, leaked responsibility, dependency, affected edge cases, and tests. Under this audit’s scoring model, each confirmed business-logic instance in a controller is a `-15` layer-violation signal. Do not score a mere long method or a framework decorator as a violation.

For remediation, characterize current API behavior first, then move workflow coordination into a focused application service/use case and move reusable rules into named domain operations. Keep DTO parsing, authorization integration, HTTP status/serialization mapping, and exception translation at the presentation boundary. Preserve not-found, conflict, validation, authorization, timeout, transaction rollback, and partial-failure behavior with controller/API and use-case tests. Avoid hiding the same logic in a generic `utils` file; extraction is successful only when ownership and dependency direction become clear.

The audit is complete when each flagged controller has a documented responsibility, no unjustified infrastructure or business-rule dependency remains, business logic is testable without booting HTTP, and success and failure paths still have coverage. No concrete controller finding can be reported until the NestJS source and runtime provider wiring are inspected.

