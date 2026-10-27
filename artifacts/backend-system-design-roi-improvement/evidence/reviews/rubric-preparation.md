# T5 rubric preparation — sealed, not source-bound

Status: preparation only. Canonical eval files and held-out prompts are not modified here. Source binding remains blocked until T0 completes dispatch locks and T1–T3 content is accepted/frozen. Do not share held-out variants with content authors.

## Tooling observations

- `scripts/evals/scorer.ts:172-210`: `contains` is case-insensitive substring in v1; v2 uses `containsV2`. `contains_any` accepts any listed alternative. `not_contains` is case-insensitive substring; `regex` uses JavaScript `RegExp(..., "i")`; `file_reference` checks path or basename. These are textual assertions, not semantic adjudication.
- `scripts/evals/scorer.ts:441-446`: semantics version is drawn from per-skill provenance, then manifest; defaults to v1. Pressure assertions are mapped from strings to `contains` at `scripts/evals/scorer.ts:475-483`.
- `scripts/evals/quality.ts:425-505`: evals require nonempty prompts and at least two assertions; supported types include `contains`, `contains_any`, `not_contains`, `regex`, and `file_reference`. Quality validation establishes shape/alignment, not whether a mechanism is safe.
- `scripts/evals/execute.ts:58-76,141-150,167-209`: runner launches Codex with `--sandbox read-only`; tool-free behavior is only prompt text, explicitly not host-enforced. It captures a final answer and usage from JSONL. It does not execute generated candidate artifacts or provide an isolated behavioral harness.

## Challenge rubric draft (not yet bound to source wording)

Each scenario gets a base condition, a realistic adverse timeline, and a changed-constraint variant. A candidate must preserve the consumer-visible invariant under all three. Grade mechanisms and evidence, not keyword presence.

| Core case | Base | Adverse | Changed constraint | Hard failure |
| --- | --- | --- | --- | --- |
| Payment / external effect ambiguity | Provider request has stable business-operation identity and recoverable status | Provider commits charge but response is lost; worker times out and retries | Provider has no idempotency support or status lookup; require a bounded reconciliation/manual hold path rather than blind retry | Duplicate charge or treating unknown outcome as definite failure/success without reconciliation |
| Tenant isolation and revocation | Authenticated tenant scope constrains source retrieval and derived results | Cross-tenant candidate enters vector/lexical result, reranking, shared cache, or async job | Source record is revoked/deleted while derived copies remain; authorization must fail closed or copies be invalidated before reuse | Cross-tenant disclosure or use of revoked data based only on similarity/source deletion claim |
| Overload / streaming | Finite admission, queue, buffer, deadline and downstream limits are explicit | Slow/disconnected client pins buffers or work during overload/drain | Remaining capacity is below admitted demand or reconnect/retry load amplifies saturation | Unbounded buffer/queue, unbounded retry, or claiming HA from instance count without capacity/degradation bounds |

Payment requires preserving the reason for retry/replay and recovery authority; tenant cases separate relevance from authorization; overload cases require finite operational bounds. A safe alternate phrasing must pass when it states the same decision, invariant, and verification without matching a preferred phrase. An unsafe candidate that repeats rubric vocabulary but violates the mechanism must fail the semantic lane even if lexical assertions pass.

## Pilot contract

- Core scope only: exactly three cases × three arms (no AGS, current AGS, improved AGS) × three independent repetitions = 27 task attempts. T4 remains conditional and excluded unless separately approved.
- Randomize arm/case order; blind graders to arm/source identity. Freeze prompts, rubrics, input hashes, context-delivery modes and candidate revision before execution.
- Keep transcript assertions, independent semantic grading, and executable candidate checks as separate lanes. Lexical scorer results cannot establish semantic efficacy.
- Candidate execution criteria, if an authorized isolated lane becomes available: count duplicate payment effects after replay; prove cross-tenant result denial and revoked-copy behavior; observe finite admission, buffer, and drain termination under overloaded/slow-client conditions. The harness must exercise generated candidate behavior; a grader-authored toy implementation is not evidence that candidate behavior works.
- Record all actor/attempt usage and full incurred costs, including failed, retried, cancelled and rejected attempts. Missing usage is unknown, never zero. No paid execution is authorized by this preparation.

## Known gaps and boundaries

- Existing runner provides transcript generation/scoring, not safe execution of generated service candidates with required isolation. Current T5 can complete lexical and semantic rubric lanes; runtime efficacy remains unverified until an approved executable lane exists. Do not extend scorer schema or runtime API under this task.
- No claim that lexical criteria prove semantic efficacy or that a 27-attempt diagnostic establishes deployment safety/statistical significance.
- Existing professionalization visible examples are regression material, not blind held-outs. Preserve fixtures and historical reports byte-for-byte; only provenance-backed new variants may enter the sealed packet.
- Current evidence directory shows `baseline-manifest.json` and zero-mismatch `baseline-verification.json`, but `dispatch-locks.json` is absent at preparation time. T0 progress still says in progress. Source binding is therefore not authorized.

## Requirements trace (preparation status)

- AC-ROI-12: rubric separates unsafe mechanism failures from keyword completeness; semantic grading contract drafted, not yet executed.
- AC-ROI-13: alternate-phrasing acceptance is an explicit grader criterion; not yet scored against candidates.
- AC-ROI-14: baseline verification reports 6,417 files and 0 snapshot/live hash mismatches. No historical fixtures/results were changed by this preparation.

Evidence sources: `docs/prd/prd-backend-system-design-roi-improvement.md:184-208,252-267`; `.agent/sdd/backend-system-design-roi-improvement/lead-dispatch-contract.md:5-15`; `.agent/sdd/backend-system-design-roi-improvement/progress.md:6-17`; `.agent/sdd/backend-system-design-roi-improvement/baseline-verification.json:2-9`; scorer/quality/runner line ranges above.
