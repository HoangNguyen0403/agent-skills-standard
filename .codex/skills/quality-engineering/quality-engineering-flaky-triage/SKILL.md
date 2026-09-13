---
name: quality-engineering-flaky-triage
description: Quarantines an intermittently failing test behind a ticket with an owner and expiry, assigns a root-cause bucket from isolated reruns, and defines when the test leaves quarantine. Use when a test is a QUARANTINE_CANDIDATE or fails without a code change; not for deterministic failures.
guardrail: true
metadata:
  triggers:
    files:
      - "**/quarantine.json"
      - "**/.flaky-tests*"
    keywords:
      - flaky test
      - flake triage
      - quarantine test
      - intermittent failure
      - unquarantine
      - retry budget
      - passes on rerun
---
# Quality Engineering: Flaky Triage

## **Priority: P0 (CRITICAL)**

## Entry

Only a `QUARANTINE_CANDIDATE` verdict enters triage: the test fails intermittently across isolated reruns with no code change between runs. A deterministic failure is `REAL_BUG_DO_NOT_HEAL` and goes to `dev-fix`, never here.

## Quarantine Contract

- Quarantine means the test still runs, its result is reported, and it does not gate merge; it never means `test.skip`.
- Every quarantined test carries a ticket with an owner and an expiry of at most 14 days. No ticket, no quarantine.
- On expiry: fixed and un-quarantined, or expiry extended once with a written reason, or the test is deleted with the coverage gap recorded in the coverage report. Silent expiry is forbidden.
- Record each entry in `flake_quarantine[]` as `{test, ticket, expiry, bucket}` so `test-loop`, `verify-work`, and `deploy-release` see it.

## Root-Cause Buckets

`ORDER_DEPENDENCE` · `SHARED_STATE` · `TIMING` · `ENVIRONMENT` · `DATA` · `PRODUCT_NONDETERMINISM`. Assign exactly one from the evidence in [Root-Cause Buckets](references/root-cause-buckets.md); `UNKNOWN` is allowed only with the reruns that were tried.

## Evidence Required

Run the test alone 10 times sequentially in the foreground. Record pass count, the failing run's artifact, and whether the failure reproduces with a fresh environment. Fewer than 10 isolated runs is not evidence; a pass on plain CI rerun is not evidence.

## Un-quarantine

A test leaves quarantine only when the root cause is fixed and it passes 10 consecutive isolated green runs after the fix. Retries, longer timeouts, or a wider matcher are not fixes; they hide the bucket.

## Reliability Impact

Each quarantined test lowers `suite_reliability_pct` in `quality-engineering-automation-health`; report the count and the oldest expiry next to `release_confidence`. See [Reliability Math](references/reliability-math.md).

## Red Flags

"just add retries: 3" · "skip it for now, we'll come back" · "it passes locally" · "extend the expiry again" — each hides a bucket instead of naming it. Stop, run the 10 isolated reruns, assign the bucket.

## Anti-Patterns

- **No skip as quarantine**: a skipped test reports nothing; quarantine still runs and reports.
- **No ticketless quarantine**: a quarantine without owner and expiry is a permanent skip in disguise.
- **No retry as fix**: `retries: N` is not a fix; it raises the pass rate and leaves the bucket unnamed.
- **No un-quarantine on a single green**: 10 consecutive isolated green runs after the fix, or it stays.

## References

- [Quarantine Ticket Template](references/quarantine-ticket-template.md)
- [Root-Cause Buckets](references/root-cause-buckets.md)
- [Reliability Math](references/reliability-math.md)
