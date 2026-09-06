# Forbidden Repairs — With Rationale

| Forbidden | Why |
|---|---|
| Weaken/remove an assertion | Turns a real regression into a silent pass. |
| `test.skip`/`fixme` without ticket + expiry | Removes coverage permanently by default. |
| Widen a matcher (`toContain` instead of `toEqual`) | Hides a value regression. |
| Timeout inflation >2x | Masks a real performance regression as a healed test. |
| Blind `--update-snapshots` | Approves an unreviewed visual regression. |
| Catch-and-continue around a failing step | Test reports green while the flow never completed. |
| Touch production code | Out of scope for a healer — that is a REAL_REGRESSION, route to dev-fix. |
