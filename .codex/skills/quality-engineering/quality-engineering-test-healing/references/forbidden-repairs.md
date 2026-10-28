# Forbidden Repairs — With Rationale

| Forbidden | Why |
|---|---|
| Weaken/remove an assertion | Turns a real regression into a silent pass. |
| Weaken fixture, seed data, or precondition with unchanged assertion text | Masks real defects by bypassing preconditions or feeding vacuous data; unchanged assertion text does not authorize fixture weakening. |
| Widen selector to match unintended elements | Silently passes against an incorrect DOM node while leaving the broken element interaction unverified. |
| `test.skip`/`fixme` as a heal | Removes coverage; quarantine with ticket + expiry keeps the test running and reporting. |
| Widen a matcher (`toContain` instead of `toEqual`) | Hides a value regression. |
| Timeout inflation >2x | Masks a real performance regression as a healed test. |
| Blind `--update-snapshots` | Approves an unreviewed visual regression. |
| Catch-and-continue around a failing step | Test reports green while the flow never completed. |
| Touch production code | Out of scope for a healer — that is a REAL_REGRESSION, route to dev-fix. |
