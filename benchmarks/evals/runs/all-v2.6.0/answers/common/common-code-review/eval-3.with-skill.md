[BLOCKER] [PR diff/files not supplied] The caching implementation cannot be reviewed with evidence.
Why: The changed code, cache configuration, invalidation behavior, and tests are required to assess logic, security, efficiency, and edge cases.
Fix: Provide the PR diff or changed files, including cache keys, TTLs, fallback behavior, and tests.

[MAJOR] [Cache read path — file unknown] Check whether cache keys include tenant/user/authorization scope.
Why: Incorrect key isolation can return one user’s or tenant’s database data to another, creating a security leak.
Fix: Include every data-isolation dimension in the key and add cross-tenant authorization tests.

[MAJOR] [Invalidation/write path — file unknown] Check whether mutations invalidate or update affected entries.
Why: Missing invalidation produces stale reads and can violate application consistency requirements.
Fix: Define invalidation for create, update, delete, transaction rollback, and failure paths; test each edge case.

[MAJOR] [Cache miss path — file unknown] Check concurrent misses and cache failures.
Why: A cache stampede can increase database load, while treating cache outages as fatal can reduce availability.
Fix: Use request coalescing or bounded protection and define a safe database fallback with timeout behavior.

[MAJOR] [Tests — files not supplied] Check coverage for hit, miss, expiry, stale data, errors, authorization boundaries, and concurrent requests.
Why: CI status alone cannot prove the caching layer preserves correctness or actually reduces database calls.
Fix: Add focused tests that assert database-call counts and each listed edge case.
