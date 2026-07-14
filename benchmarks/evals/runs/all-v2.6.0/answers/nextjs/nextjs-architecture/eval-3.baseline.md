Break the circular dependency instead of allowing `cart` and `product` to import each other's internals. Identify the shared concept and extract a small dependency-free contract, such as `ProductSummary`, pricing types, or a `getProductPrice` port, into a domain/shared module. Then choose one direction for feature dependencies:

```text
product -> shared/domain
cart    -> shared/domain
checkout/application -> cart + product ports
```

If a cart use case needs product data, have the application/service layer compose the two features or inject a product repository/port into the cart use case. Keep UI composition at the route or application layer. Do not fix the cycle with barrel exports, dynamic imports, or duplicated business rules; those hide the coupling and can still produce initialization bugs. Add an import-boundary/lint rule and tests for the extracted contract so future changes preserve the one-way dependency graph.

