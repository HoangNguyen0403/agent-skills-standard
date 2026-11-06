# Design Walkthrough: Project Verification Readiness

Status: design approval remains distinct from the observed repository-scoped partial proof; no implementation acceptance claimed.

## Authority And Scope

Source: approved docs/prd/prd-pstack-verification-readiness.md, approval approved(operator, 2026-11-05), SHA256 `367e3db74753f0b36a4265a350b0b124a09c59eb1a9c89a277e417a6fd69b874` observed at design start. Detailed design: srs-pstack-verification-readiness.md, approved(operator, 2026-11-05). Design and execution approval covers bounded repository implementation only; no additional implementation scope, external pilot, publication, merge or release authority follows from that bounded approval.

## Evidence Observed

- Read the approved REQ-001–003 and AC-01–14 definitions and prior scoped-approval records.
- Read ARCHITECTURE.md §3 and ADR-005: canonical lifecycle is portable source, not a new daily runtime.
- Read scripts/outcome/schema.ts: the AC trace pattern required at least three digits at design time; the approved compatibility change to `/^AC-\d{2,}$/` is now delivered in `scripts/outcome/schema.ts` and `scripts/trace/types.ts`.
- Reused current readiness/verify-work and approved discovery references; no pstack productivity or runtime claim is inferred from prose.
- Recorded explicit design decisions and source boundaries in the SRS. Component verification definitions live only in its requirement cards; this document does not redefine the PRD ACs.

| Layer | Status | Reason |
| --- | --- | --- |
| Source/contract inspection | Completed | Approved inputs and relevant current source inspected; this is not external project proof |
| Focused outcome/trace tests | PASS (parent-run) | Expected RED 47/51 then GREEN 51/51 on the frozen source; parent observed raw runner output (`red-receipt.md`, `green-receipt.md`) |
| Covering outcome and trace suites | PASS (parent-run) | 37/37 outcome and 62/62 trace suites after the production edit |
| Implementation build, lint and formatters | NOT RUN | Not part of this worker's scope; parent owns any final checks |
| Outcome schema/scope audit | PARTIAL | Design receipt audit PASS after the compatibility change; integration record audit remains parent-owned |
| Receipt JSON syntax | PASS | Actual Node JSON.parse returned the exact BRD/REQ/AC/SRS trace; does not certify schema, authority or trace correctness |
| Real repository-kit journeys, side effects and cleanup | PARTIAL (`PROOF_INCOMPLETE`) | Latest parent run observed 30 checks passed, 0 failed, 0 blocked, 1 unexercised, 3 manual across the repository's real CLI/API targets. AC-07 product regression remains unexercised; manual freshness decisions are not technical PASS |
| Disposable consumer install/discovery parity | PASS (bounded repository scope) | Root `LICENSE` plus three skill resources matched byte-for-byte across two consumer agents; 14 lock paths; the kit's own preflight (readiness oracle) was healthy with 12 checks, while the separate consumer `ags doctor` CLI reported 7 checks (4 ok, 1 warn, 0 fail, 2 skip) and read-only execution left 17 consumer files unchanged |
| Retained proof and cleanup | PASS (bounded run scope) | Run proof: 103,388 bytes, SHA-256 `4dd49251e23767ebe6f213cc5a75616bc8f93e4a4aeb6b7bcdb4d30156f6a4e2` unchanged after owned consumer/scratch cleanup; refusal proof allowed=false and actions=[] |
| Generation and native export parity | PASS for source generation (parent-run and worker) | Generation contract suite PASS 87/87. Plain apply and bounded recovery were refused earlier and are retained as history. A human-authorized disposable rehearsal proved the pinned-base producer reproduces the current bytes; the released in-place adoption then applied 31 paths total: 30 generated outputs plus the ownership manifest, with 14 adoption proof records, and the follow-up check passed. Receipts: `artifacts/generation-logs/attempt-2026-11-05T15-16-29-210Z-b3b8c7/receipt.json`, `generation-check-receipt-20261105T151736Z.json`. Independent source and package review APPROVE |
| Final-source-pin reproof | PENDING | SRS evidence update changes the canonical source pin; parent must run final `--run` and `--refusal-probe` at frozen final bytes |
| Independent implementation review | APPROVE (bounded source, quality and integration) | Reviewer approved the current bounded evidence and limits; this is not whole-criteria completion or human acceptance |
| Human technical-design approval | APPROVED | Operator approval ("approve design + subagent-driven implementation") on 2026-11-05 |
| Business acceptance / release | Not assessed | Outside this document's authority |

The per-AC evidence and exact boundaries are in the SRS §Implementation Verification Results. The current bounded run is evidence of repository CLI/API behavior only: no external project pilot, product-regression demonstration, actual `implementation-readiness`/`verify-work` execution, automatic freshness enforcement, or UAT/release readiness is claimed.

## Future Proof Location

Use the target's existing driver evidence directory for web/native work. For other local surfaces, use the SRS's generic run-owned artifact location. Bind proof to actual source/build/dirty identity and include action, result, side effects and cleanup observations. No screenshots, transcripts, traces or test outputs have been fabricated for future verification IDs.

## Readiness Boundaries

Repository-only design is complete when its source contracts and decisions are recorded. Implementation additionally requires design approval, an explicit execution approach, accountable component owners and readiness assessment. Real target driving additionally requires project-owner runtime/data authority; that target-specific prerequisite blocks only the dependent consumer proof, not independent approved repository work.

## Known Tooling Limitation

Resolved for formal AC identity: the outcome and trace grammars now accept two-or-more-digit AC suffixes while preserving exact tokens, rejecting malformed forms and leaving BRD-OBJ/REQ/SRS plus the qualified historical grammar unchanged. Historical planning receipts that recorded the pre-change incompatibility remain historical; they are not relabeled as passing.
