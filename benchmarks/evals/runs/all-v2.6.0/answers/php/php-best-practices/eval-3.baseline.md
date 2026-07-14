Refactor a God class by first listing its responsibilities and collaborators, then extracting cohesive services or value objects behind small interfaces. Keep orchestration in a thin application service, inject dependencies, and preserve behavior with characterization tests before moving code.

For example, separate validation, persistence, payment, and notification into OrderValidator, OrderRepository, PaymentGateway, and Notifier. The remaining OrderService should coordinate those objects rather than own their implementation details.

