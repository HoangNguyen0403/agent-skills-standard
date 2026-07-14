Do not test private methods or implementation details directly, share mutable state between tests, depend on execution order, use production databases or external services without isolation, or make tests depend on the current time, randomness, network, or filesystem accidentally.

Also avoid overusing mocks, asserting trivial framework behavior, swallowing failures, and writing broad integration tests where a focused unit test is sufficient. Keep tests deterministic, independent, readable, and meaningful; use explicit fakes, fixtures, clocks, and temporary resources when those boundaries are required.

