---
name: common-project-verification
description: Standardizes project-owned verification kits, journey mapping, read-only doctor checks, evidence retention, and map maintenance across web, mobile, and service targets. Use when creating verification kits, driving user journeys, validating instance health, scoping proof freshness, or classifying verification discrepancies during maintenance.
metadata:
  triggers:
    keywords:
    - project verification
    - verification kit
    - journey map
    - verification doctor
    - drive journey
    - verify journey
    - evidence retention
    - map maintenance
    - proof freshness
    - verification discrepancy
---
# Project Verification Standard

## **Priority: P0 (CRITICAL)**

Applies to all project-level verification kits, journey mapping, and maintenance runs.

## Core Rules

- **Portable guidance, project-owned operations**: Public guidance defines contracts; target projects own commands, credentials, and environments.
- **Exact canonical references**: Link canonical source, revisions, and raw AC IDs (e.g., `AC-01`, `AC-02`). Never duplicate or edit criteria in kits.
- **Read-only doctor**: A listening port is not readiness. Validate build, auth, and state read-only. Never drive an unhealthy instance or mutate state during health checks.
- **Single driver ownership**: Only assigned owner drives a shared instance. Parallel driving requires dedicated ports, profiles, and data.
- **Guaranteed cleanup and durable evidence**: Capture action, observable state, and side effects. Cleanup terminates run-owned processes only and guarantees evidence retention after success, failure, or doctor refusal.
- **Scoped freshness**: Dependency or build changes invalidate intersecting journeys. Unrelated proof remains valid with explicit identity basis. Timestamp alone is never freshness.
- **Discrepancy discipline**: Classify discrepancies as documentation drift, harness failure, or product regression. Never alter application code or weaken criteria during kit maintenance.

## Verification Lifecycle

1. **Discovery**: Read explicit kit reference from task/handoff first. Fallback to project docs, then `docs/verification/<app>/`. Reconcile deficiencies within scope; report missing prerequisites without guessing commands.
2. **Doctor**: Execute read-only health checks before driving. Validate target build, prerequisites, and oracle. Refuse execution if unhealthy.
3. **Drive**: Execute real entrypoint for mapped journeys. Capture action, expected vs actual state, and side effects. Failed or surprising drive requires doctor check and authorized owned reset before retry.
4. **Cleanup**: Terminate run-owned resources only. Confirm proof artifacts remain intact in evidence directory across all outcomes.
5. **Maintain & Report**: On drift or failures, classify discrepancy. Both clean and changed outcomes require all required in-scope coverage complete; incomplete required coverage reports blocked. Re-drive every claimed correction live before reporting changed.

## Maintenance Discrepancy Classification

| Discrepancy | Root Cause | Required Action |
| --- | --- | --- |
| Documentation drift | App satisfies criteria, map/recipe wrong | Update map; re-drive live before claiming changed |
| Harness failure | Harness cannot reach working app path | Fix harness or report blocked; never infer PASS from source |
| Product regression | App violates approved criterion | Report product defect; route fix separately; preserve criterion |

## Anti-Patterns

- **No port-only readiness**: Never treat an open port as an operational application.
- **No criterion editing**: Never weaken or modify approved criteria during kit maintenance.
- **No evidence deletion**: Never purge evidence directories during teardown.
- **No concurrent shared driving**: Never drive an unowned or shared instance concurrently.
- **No silent substitution**: Never substitute an unauthorized target when a kit reference fails.

## References

- [Kit Contract](references/kit-contract.md) — Discovery, README contract, journey mapping, and resource ownership.
- [Maintenance & Freshness](references/maintenance.md) — Proof records, freshness rules, maintenance workflows, and gate integration.
