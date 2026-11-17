# Feature Plan: System Design Contract Coverage

Status: implementation approved; owner: requesting maintainer; delivery_mode: standard
slug: system-design-contract-coverage
operator_profile: technical; lane: direction; snc_tier: low; model_tier: standard
source_approval: approved(requesting maintainer, 2026-11-16) — all five investigated gap groups in scope
plan_approval: approved(requesting maintainer, 2026-11-16)
execution_approach: subagent-driven; selected interactively by requesting maintainer
repository_status: pr_ready; activation_status: not_required

## Decision Brief

- **Changes since approved scope:** Decomposition into five disjoint source slices plus integration and independent review. Two defects found during planning are added to slice S2: `403` is labelled "unauthorized", and `Deprecation: true` predates RFC 9745, which requires a structured date (`Deprecation: @<unix-seconds>`).
- **Recommendation:** Close the gaps in existing skills and references. Add one new reference file (`common-api-design/references/consumer-contract.md`). Add no new skill, no tenth review axis, and no model or provider names.
- **Impact if wrong:** New rules could over-prescribe (optimistic locking everywhere, a lease on every cache key) or copy guidance another category owns. Each slice therefore carries a counter-case eval and links to the existing owner instead of restating it.
- **Evidence and limitations:** Gap evidence is the 2026-11-16 repository investigation: no backend lost-update or `If-Match` guidance in `skills/system-design`; no `Idempotency-Key`, `ETag`, or object-level authorization in `common-api-design`; stampede covered by one rule line and one case pack; only one cross-category link from the category to the API, security, observability, debugging, or incident owners. No candidate text exists and no check has run. Offline eval fixtures are assertion evidence, not model-efficacy evidence.
- **Execution decision:** Subagent-driven, approved interactively on 2026-11-16; disjoint ownership enables parallel source work with independent review.
- **Authority:** Implement and verify all slices; live evaluations remain `not_run`. No publication, deployment, premium consultation, or release is authorized.
- **Independently ready slices:** S1–S5 touch disjoint files and can run in parallel; S6 and S7 follow.

## Outcome And Guardrails

- **Outcome:** A design or review session that meets concurrent writers, a public API contract, a hot-key expiry, a regulated or incident-driven constraint, or a large existing codebase finds a concrete rule, an owner link, and a verification step in the system-design category or the skill it routes to.
- **Guardrails:** Every canonical `SKILL.md` stays at or below 100 lines. The review scorecard keeps nine axes. Idempotency stays owned by `idempotency-contract.md`, critical-flow semantics by `flow-contracts.md`, delegation placement by `common-subagent-driven-development` §1. Existing eval cases keep passing. Generated indices and mirrors are regenerated, never hand-edited. Guidance stays host-neutral.

## Scope And Non-Goals

- **Scope fence:** `skills/system-design/**`, `skills/common/common-api-design/**`, their `evals/evals.json`, generated indices and mirrors, `skills/metadata.json`, `CHANGELOG.md`.
- **Non-goals:** New skills for on-call, postmortems, mentoring, or code review; framework-specific code; changes to workflows, CLI, MCP, or sync tooling; publication, tagging, or release; paid live eval runs without separate approval.

## Requirements And Acceptance Criteria

| Req ID | Requirement | Owner | Priority | Status |
| --- | --- | --- | --- | --- |
| REQ-001 | Concurrent-writer (lost update) contract exists at design level | maintainer | P0 | proposed |
| REQ-002 | `common-api-design` covers the consumer contract and its two defects are fixed | maintainer | P0 | proposed |
| REQ-003 | Cache miss path is sized, mechanism-selected, and failure-bounded | maintainer | P1 | proposed |
| REQ-004 | Security, compliance, data-modeling, API, observability, and incident concerns route to their owners; incidents feed back into design | maintainer | P1 | proposed |
| REQ-005 | Review-existing mode defines a bounded evidence summary for delegated read-only lookup | maintainer | P2 | proposed |
| REQ-006 | Review references detect the new failure classes without a new axis | maintainer | P1 | proposed |
| REQ-007 | Changed surfaces are regenerated, versioned, and verified | maintainer | P0 | proposed |

| AC ID | Req ID | Given | When | Then | Verification lane |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Two clients read version 10 of one resource | Both submit changes | Guidance requires an atomic version precondition at the authoritative writer, one success, and a declared conflict response with state unchanged | eval case + reference read |
| AC-002 | REQ-001 | A resource where last-write-wins is declared acceptable | Design is evaluated | Guidance accepts a blind overwrite and does not demand versioning | counter-case eval |
| AC-003 | REQ-002 | A side-effecting `POST` that clients retry | API is designed | Skill names `Idempotency-Key`, links the idempotency contract, and does not restate it | eval case + link check |
| AC-004 | REQ-002 | A read-then-update endpoint | API is designed | Skill gives `ETag`/`If-None-Match`/`304` and `If-Match`/`412`/`428`, and links the concurrent-writer section | eval case |
| AC-005 | REQ-002 | A handler returning a raw store row | API is reviewed | Skill requires an explicit response mapping, one casing convention, and object-level authorization linked to `common-owasp` | eval case |
| AC-006 | REQ-002 | Existing skill text | Slice lands | `403` reads as forbidden; deprecation uses the RFC 9745 date form with `Sunset` (RFC 8594) | text check |
| AC-007 | REQ-003 | Hot key at a stated request rate and fill latency | Expiry is evaluated | Guidance computes `concurrent fills ≈ key request rate × fill latency`, compares it with origin headroom, and selects a mechanism by scope | eval case with numbers |
| AC-008 | REQ-003 | A coalesced fill whose owner fails or stalls | Design is evaluated | Guidance bounds waiters by count and deadline, sets a fill timeout, and prevents a late fill from overwriting newer data | eval case |
| AC-009 | REQ-003 | Low-traffic key with cheap fill | Design is evaluated | Guidance accepts no miss-path machinery | counter-case eval |
| AC-010 | REQ-004 | A design with a threat, residency, schema, or API-contract question | Category guide or methodology is read | The owning skill or workflow is named and every link target exists | link check |
| AC-011 | REQ-004 | An existing system with a recurring incident class | Review ground truth is gathered | Guidance maps each contributing cause to a mechanism change, a detection gap, or an owned accepted risk | eval case |
| AC-012 | REQ-005 | A review needing broad repository reading | Lookup is delegated | Guidance links the one placement contract and defines the summary fields; no model, provider, or tier is named | eval case + text check |
| AC-013 | REQ-006 | The new failure classes | Review references are read | Mistakes table has one row each; Caching axis names miss-path protection; axis count is nine | text check |
| AC-014 | REQ-007 | All slices merged | Checks run | Line cap, keyword-collision, alignment, eval tests, and index check pass; versions and changelog updated | commands in S6 |

## Implementation Plan, Task Slices And Verification Plan

Fixed anchors, so slices do not wait on each other:
`system-design-principles/references/distributed-systems.md#concurrent-writers`,
`system-design-building-blocks/references/building-blocks.md#miss-path-protection`,
`system-design-resilience-ops/references/reliability-operations.md#incident-feedback-loop`,
`common/common-api-design/references/consumer-contract.md`.

### Task 1 — Concurrent writers (REQ-001; AC-001, AC-002) — size S, confidence high

**Scope / owned write set:** `skills/system-design/system-design-principles/`.
**Inputs:** This plan, existing principle rules, idempotency contract, eval fixtures.
**Outputs:** Updated canonical skill, concurrency reference, and eval fixtures.
**Real ingress:** Architecture requests with concurrent mutable state.
**Invariants:** Preserve idempotency ownership and scope-qualified mechanisms.
- **Positive:** Concurrent read-modify-write conflicts are arbitrated atomically.
- **Negative:** Declared last-write-wins is not rejected without an invariant violation.
**Verification owner:** Implementer supplies evidence; integrator runs covering checks; independent reviewer judges AC-001–002.
**Handoff / freeze:** Final report freezes owned files until an orchestrator correction assignment.
**Correction route:** One focused correction to this implementer, then eligible configured fallback.

- `references/distributed-systems.md`: add `## Concurrent Writers {#concurrent-writers}` with these rules.
  - Classify each mutable write as blind overwrite (last-write-wins declared acceptable) or read-modify-write (conflict must be detected).
  - Detect with a version or validator precondition checked atomically with the write at the authoritative writer; a separate read-then-write check is a race.
  - Declare the conflict response: reject, state unchanged, client re-reads then merges or resubmits. Silent merge only under a declared field-level or CRDT rule.
  - Prefer optimistic control when contention is low and no lock should span a round trip. Use a serialized owner or atomic operation (decrement, conditional update) when contention or retry cost is high.
  - Concurrency control arbitrates different intents; idempotency deduplicates one intent. A request may need both.
  - Verification: the AC-001 scenario. Link `database/database-transactions/references/isolation-levels.md` and the API mechanics in `consumer-contract.md`.
- `SKILL.md`: one bullet under Distributed Systems linking the anchor; add keywords `lost update`, `optimistic concurrency`. Stay ≤ 83 lines.
- `evals/evals.json`: add AC-001 and AC-002 cases; add one `should_trigger` per new keyword.

### Task 2 — API consumer contract (REQ-002; AC-003–AC-006) — size M, confidence high

**Scope / owned write set:** `skills/common/common-api-design/`.
**Inputs:** This plan, existing API skill, HTTP RFCs, canonical idempotency contract.
**Outputs:** Updated skill and examples, new consumer-contract reference, eval fixtures.
**Real ingress:** Endpoint and API contract design requests.
**Invariants:** Preserve canonical contracts and accurate HTTP semantics.
- **Positive:** Conditional writes and representation boundaries protect consumer-visible state.
- **Negative:** Do not duplicate the authoritative idempotency contract or require locks universally.
**Verification owner:** Implementer supplies evidence; integrator runs covering checks; independent reviewer judges AC-003–006.
**Handoff / freeze:** Final report freezes owned files until an orchestrator correction assignment.
**Correction route:** One focused correction to this implementer, then eligible configured fallback.

- New `references/consumer-contract.md` (≤ 90 lines), sections in this order:
  1. Representation boundary: explicit response mapping, allow-listed input and output fields, one casing convention declared in the spec, flat resources with ids instead of deep nesting.
  2. Method semantics: `GET` safe; `PUT` and `DELETE` idempotent; `PATCH` and `POST` not idempotent unless the contract makes them so.
  3. Retry-safe writes: `Idempotency-Key` on side-effecting non-idempotent requests; link `system-design-principles/references/idempotency-contract.md` for scope, payload mismatch, concurrent duplicates, and retention. State the header's current IETF status after checking it.
  4. Conditional requests: `ETag` + `If-None-Match` → `304`; `If-Match` on update and delete → `412`; `428` when a precondition is required and absent; strong validators for `If-Match` (RFC 9110). Link `#concurrent-writers`.
  5. Pagination: opaque cursor over a total order (sort key plus unique tie-breaker), seek predicate, explicit error for an invalid or expired cursor.
  6. Compatible evolution: add the new field, migrate consumers, measure old-field usage, announce with `Deprecation` and `Sunset`, then remove. New version only for an unavoidable break.
  7. Authorization: `401` unauthenticated versus `403` forbidden; object-level check on every id and action, enforced in the data access predicate; link `common-owasp`.
  8. Rate limits: per identity and cost class, `429` + `Retry-After`; link `system-design-building-blocks` rate limiting.
- `SKILL.md`: fix the `403` label; replace `Deprecation: true` with the RFC 9745 form; add a short Consumer Contract section pointing to the reference; add keywords `idempotency key`, `etag`, `conditional request`. Stay ≤ 98 lines.
- `references/REFERENCE.md`: fix the deprecation header example.
- `evals/evals.json`: add cases for AC-003, AC-004, AC-005 and one `should_trigger` per new keyword.

### Task 3 — Cache miss path (REQ-003; AC-007–AC-009) — size M, confidence high

**Scope / owned write set:** `skills/system-design/system-design-building-blocks/`, `skills/system-design/system-design-estimation/`.
**Inputs:** This plan, current caching rules, estimation reference, existing cache case pack.
**Outputs:** Miss-path contract, sizing example, skill links, eval fixtures.
**Real ingress:** Cache strategy and capacity-estimation requests.
**Invariants:** Match units, mechanism scope, freshness, and resource bounds.
- **Positive:** Hot-key refill, waiting, and stale publication are bounded.
- **Negative:** No lease or coalescing requirement for a cheap low-traffic key.
**Verification owner:** Implementer supplies evidence; integrator runs covering checks; independent reviewer judges AC-007–009.
**Handoff / freeze:** Final report freezes owned files until an orchestrator correction assignment.
**Correction route:** One focused correction to this implementer, then eligible configured fallback.

- `building-blocks/references/building-blocks.md`: under Caching add `### Miss-Path Protection`.
  - Mechanism by scope: in-process coalescing (one fill per instance); cross-instance bounded lease with expiry and version fencing (when instances × fill cost exceeds origin headroom); serve-stale within the declared freshness bound; refresh-ahead for predictable hot keys; TTL jitter for correlated expiry only.
  - Failure bounds: waiter count and deadline with a declared overflow behavior; fill timeout shorter than the waiter deadline; an owner error is not cached beyond a short negative TTL and retries are capped; a late fill must not overwrite a newer version; cold start or flush is a stampede on every key, so cap origin concurrency globally.
  - Verification: concurrent-miss burst yields one fill per key per declared scope; owner killed mid-fill; waiters resolve within the deadline.
- `building-blocks/SKILL.md`: rewrite the existing miss-path rule in place to link the anchor; add keywords `single-flight`, `thundering herd`. Stay ≤ 80 lines.
- `estimation/references/estimation-numbers.md`: add `## Cache Miss Burst` with `concurrent fills ≈ key request rate × fill latency`, one synthetic worked example, and the comparison against origin concurrency headroom.
- `estimation/SKILL.md`: one link line.
- Evals: building-blocks cases for AC-008 and AC-009; estimation case for AC-007.

### Task 4 — Routing, compliance intake, incident loop, delegated evidence (REQ-004, REQ-005; AC-010–AC-012) — size M, confidence medium

**Scope / owned write set:** `skills/system-design/references/framework-map.md`, `skills/system-design/system-design-methodology/`, `skills/system-design/system-design-resilience-ops/`.
**Inputs:** This plan, existing category owners, placement contract, incident workflows.
**Outputs:** Owner routes, intake updates, incident feedback loop, delegated summary contract, eval fixtures.
**Real ingress:** Cross-category architecture questions and review-existing sessions.
**Invariants:** Canonical ownership and lifecycle-qualified evidence remain distinct.
- **Positive:** Design risks route to existing owners with explicit evidence gaps.
- **Negative:** No model/provider names, mandatory delegation, or claim of installed category-guide delivery.
**Verification owner:** Implementer supplies evidence; integrator runs covering checks; independent reviewer judges AC-010–012.
**Handoff / freeze:** Final report freezes owned files until an orchestrator correction assignment.
**Correction route:** One focused correction to this implementer, then eligible configured fallback.

- `framework-map.md`: add `## Cross-Category Routes` (concern → owner → when) for API contract (`common-api-design`), threat and object-level authorization (`common-owasp`, `common-security-standards`), schema and data modeling (`database-schema-design`), transactions (`database-transactions`), telemetry (`common-observability`), production debugging (`common-debugging`), and active incidents (`incident-hotfix`, `monitor-respond` workflows). Update the reviewed date.
- `methodology/SKILL.md`: one line in Phase 3 naming those owners, because the category guide is registry-delivered only. Stay ≤ 80 lines.
- `methodology/references/intake-checklist.md`: add a row for regulatory or contractual obligations (data classes, residency, retention and deletion, audit evidence, owner). Extend the existing-system row with open postmortem actions. In Existing-system review, add the delegated-lookup rule: link `common-subagent-driven-development` §1; the summary carries component, owner, edge, citation, `evidence_kind: code`, `evidence_confidence: documented`, and open questions; the lead keeps scoring and decisions.
- `resilience-ops/references/reliability-operations.md`: add `## Incident Feedback Loop {#incident-feedback-loop}` — each contributing cause maps to a mechanism change, a detection gap with its alert and runbook owner, or an accepted risk with an owner and review trigger; a recurring cause class is a design finding.
- Evals: methodology cases for AC-011 and AC-012.

### Task 5 — Review hooks (REQ-006; AC-013) — size S, confidence high

**Scope / owned write set:** `skills/system-design/system-design-review/`.
**Inputs:** This plan, fixed anchors in S1–S4, existing scorecard and semantic evaluator.
**Outputs:** Mistake rows, caching criterion, lost-update hard failure, eval fixtures.
**Real ingress:** Proposed design, implementation, and operations reviews.
**Invariants:** Nine axes, non-compensable gates, and lifecycle evidence rules remain intact.
- **Positive:** New adverse timelines yield owner-ready review findings.
- **Negative:** Do not add an axis or reward unjustified caching machinery.
**Verification owner:** Implementer supplies evidence; integrator runs covering checks; independent reviewer judges AC-013.
**Handoff / freeze:** Final report freezes owned files until an orchestrator correction assignment.
**Correction route:** One focused correction to this implementer, then eligible configured fallback.

- `references/mistakes-table.md`: add rows for lost update, internal columns exposed as contract, hot-key expiry saturating the origin, and a failure class recurring after a postmortem. Each row links its fixed anchor.
- `SKILL.md`: extend the Caching axis cells in place with miss-path protection; no added lines.
- `references/semantic-evaluation.md`: append to flow-specific hard failures a read-modify-write that silently overwrites a concurrent committed change where the invariant forbids it.
- `references/scorecard.md`: Ground Truth template records open postmortem actions.
- `evals/evals.json`: one case per new row class.

### S6 — Integration (REQ-007; AC-014) — typed exception: prerequisite for release; depends on S1–S5

- Bump `skills/metadata.json`: `system-design` 1.2.7 → 1.2.8, `common` 2.9.8 → 2.9.9; add the `CHANGELOG.md` entry.
- Run, in order: `pnpm generate-indices`, `pnpm generate-indices --check`, `pnpm calculate-tokens`, `pnpm audit:keywords`, `pnpm check-alignment`, `pnpm test:evals`, `pnpm validate`.
- Confirm every touched `SKILL.md` is ≤ 100 lines and every new relative link resolves.

### S7 — Independent review — depends on S6

A reviewer who authored no slice checks the diff against AC-001–AC-014, source accuracy of the HTTP and RFC claims, duplication against owning contracts, and counter-case behavior. Findings return to the slice owner for one correction round.

## Open Consequential Decisions

| Decision | Owner | Affected slice | Required input |
| --- | --- | --- | --- |
| Execution approach: subagent-driven | maintainer | all | selected interactively |
| Live eval runs | maintainer | S6 | `not_run`; separate approval required |
| RFC 9745 deprecation fix | maintainer | S2 | keep in S2 as proposed |

## Status And Receipt

- `feature_status`: implemented
- S1–S5 canonical sources independently approved after corrections. Offline eval tooling tests: 909/909 PASS on final corrected sources. Live model efficacy: NOT RUN.
- S6 complete: baseline producer proof accepted by `generate-indices --adopt-base`; generated metadata metrics were restored to the baseline projection before proof, then regenerated. A subsequent normal generation reconciled the ownership manifest. Final `generate-indices --check` PASS; canonical/host parity PASS; `validate:all` and `audit:sdlc` PASS with reported non-blocking warnings. No safeguards bypassed.
- Local evidence receipt: `artifacts/system-design-contract-coverage/verification.md`; generation logs are local artifacts, not published evidence.

## References

- Investigation of `skills/system-design/**` and `skills/common/common-api-design/**`, 2026-11-16.
- [RFC 9745](https://www.rfc-editor.org/rfc/rfc9745), [RFC 8594](https://www.rfc-editor.org/rfc/rfc8594), [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110).
- `CONTRIBUTING.md` §3 (line cap, evidence first, host-neutral guidance, system-design package ownership).

## Next Workflow

- Submit source and synchronized derivatives for maintainer PR review; merge, release, and deployment remain separate decisions.
