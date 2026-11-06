# Live held-out evaluation result: FAIL (6 of 8 cases)

Executed once under `protocol.md` (frozen before any answer existed). No retry, rewording or threshold change.

## Outcome
| Case | Base | Variant | Case result |
|---|---|---|---|
| N1-01 orm-lazy-loop | PASS | PASS | PASS |
| N1-02 serializer-lazy-load | PASS | PASS | PASS |
| N1-03 per-record-aggregate | **FAIL** | PASS | **FAIL** |
| N1-04 graphql-resolver-fanout | PASS | PASS | PASS |
| N1-05 already-batched-control | PASS | PASS | PASS |
| N1-06 spare-instance-control | **FAIL** | PASS | **FAIL** |
| N1-07 slow-constant-query | PASS | PASS | PASS |
| N1-08 paginated-tenant-loading | PASS | PASS | PASS |

Protocol requires all 8 cases, so **AC-07 / AC-08 / held-out AC-09 are NOT met by this run.** Acceptance stays open.

## What the two failures were (adjudicator quotes, `adjudication.md`)
- N1-03-base: mandatory item "zero-order merchants return count 0 and sum 0, not omitted" not met; the answer allowed a `NULL` total and used `SUM(amount)` without `COALESCE`.
- N1-06-base: mandatory item "verification of failover domains and health checks for hot spares" not met; failure-domain independence and a drill were covered but health checks/failure detection were not.
- Both are borderline per the adjudicator; no hard failure fired. If both had been MET the result would be 8/8. They were not re-scored.

## Parent checks (not the adjudicator's)
- Calibration gate: adjudicator's six verdicts (5 unsound, then CAL-N1-06 sound) equal the frozen expected verdicts, 6/6. Adjudication is valid.
- Isolation: activity logs of all 16 examinee sessions were read; none opened `benchmarks/` or `artifacts/` or the held-out file. N1-07-variant ran one unspecified glob search; the session shows no oracle content.
- Controls N1-05/06/07 were all classified as not N+1 amplification by every answer.

## Limits and disclosures
- One examinee model (DeepSeek low effort), one pass, 16 answers: this is a small sample and a weak examinee. A failure here is not evidence about stronger models, and a pass would not have been either.
- No no-skill arm, so no claim of skill-attributable uplift in either direction.
- Every examinee session began with an injected workspace message ("/brainstorm-feature We want to improvement our skills for de...") that names the topic but contains no oracle content. A different workspace would remove this.
- Examinees ran in the same repository workspace, so isolation of oracle files rests on instruction plus the log review above, not on filesystem separation.
- Adjudicator could not check the examinee-isolation rule or word limits (not in its inputs); the parent did the isolation check, word limits were not measured.
- Adjudicator ran on the VMO Claude account by the maintainer's explicit override of the profile boundary; recorded in `protocol.md`.
- Skills were deliberately NOT edited after seeing these results: changing the skill and re-running the same held-out cases would make them non-held-out. A fix to zero-relation and health-check guidance, if wanted, needs a new held-out set.
- Token/cost totals unavailable from the host.
