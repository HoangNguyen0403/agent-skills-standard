Orders should access loyalty points through the loyalty feature’s public API/application service—not its database, entities, or internal modules.

Expose a read contract such as `LoyaltyPointsReader.getPoints(customerId)` and inject/use it from orders. Loyalty remains the owner of the data and can later change its storage or implementation without affecting orders.
