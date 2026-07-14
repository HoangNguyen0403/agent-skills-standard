Do not test private methods directly, over-mock implementation details, or use real network services and production databases in unit tests. Avoid shared mutable fixtures and order-dependent tests. Prefer public interfaces, deterministic fixtures, mocks for external boundaries, and SQLite :memory: or transactions for database tests. Do not chase coverage numbers with meaningless assertions.

