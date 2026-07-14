Organize by business domain, for example:

```text
app/
  Domains/
    Order/
      Actions/
      DTOs/
      Contracts/
  Models/
  Providers/
```

Keep `User`, `Order`, and `Payment` concerns together within their domains instead of creating global `Controllers`, `Services`, and `Repositories` buckets for every feature. Standard Eloquent models can remain in `app/Models/`, while domain Actions own use cases, DTOs carry typed data, and Contracts define persistence boundaries. Bind implementations in a provider. This makes a feature's flow discoverable and prevents controllers from accumulating Eloquent queries.

