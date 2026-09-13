# Root-Cause Buckets

Assign exactly one bucket from evidence. Each row gives the signal that proves it and the fix class that ends the quarantine.

| Bucket | Proven by | Fix class |
| --- | --- | --- |
| `ORDER_DEPENDENCE` | Passes alone, fails after a specific other test; reordering changes the outcome | Isolate state the earlier test leaks; make setup self-contained |
| `SHARED_STATE` | Fails only when run in parallel workers or against a shared account/DB row | Per-worker fixtures, unique test data per run |
| `TIMING` | Trace shows the element or response appearing after the assertion; explicit wait on the actual state fixes it | Replace sleeps with state waits per `quality-engineering-test-healing` repair catalog |
| `ENVIRONMENT` | Fails on one runner image, OS, browser, or device only | Pin or fix the environment; document the matrix |
| `DATA` | Depends on a seed, clock, or external record that changes between runs | Freeze the clock, seed deterministically, own the data |
| `PRODUCT_NONDETERMINISM` | The product itself behaves differently on identical input (race in app code, unordered collection rendered in order) | Route to `dev-fix`: the test found a real bug even though it is intermittent |
| `UNKNOWN` | Ten isolated reruns did not reproduce and no signal fits | Keep in quarantine with the reruns recorded; expiry still applies |

`PRODUCT_NONDETERMINISM` is the only bucket that leaves flaky-triage: it becomes `REAL_BUG_DO_NOT_HEAL` with the intermittent evidence attached.
