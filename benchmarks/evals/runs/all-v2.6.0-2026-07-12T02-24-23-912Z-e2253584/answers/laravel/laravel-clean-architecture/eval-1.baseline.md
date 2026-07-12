Model a bounded context around a business capability rather than around Laravel technical layers. A typical context contains aggregates/entities, value objects, domain services/events, application use cases, and infrastructure adapters:

```text
app/Domain/Orders/{Entities,ValueObjects,Events}
app/Application/Orders/{Commands,Handlers}
app/Infrastructure/{Persistence,Payments}
app/Http/{Controllers,Requests,Resources}
```

Keep domain code independent of HTTP and framework concerns where practical. Let an application handler coordinate a use case and a repository/adapter persist it; controllers translate HTTP to that use case. Use transactions around aggregate changes, enforce invariants in the domain, and avoid introducing DDD ceremony for simple CRUD.

