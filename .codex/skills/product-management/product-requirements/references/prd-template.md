# Product Requirements Document (PRD): [Feature Name]

**Status**: Draft | **Owner**: [Name] | **Delivery mode**: brief \| standard \| extended | **Last Updated**: [YYYY-MM-DD]

> Delivery mode is a routing decision, not an approval. `brief` requires an approved low-risk, nonsensitive task carrying outcome, scope fence, owner, observable criteria, approval reference, and verification lane. A sensitive change is always `extended` with its applicable technical design and human gate, regardless of the label.

## 1. Decision Brief

- **Changes since approved revision**: [what changed, or "initial draft"]
- **Recommendation**: [recommended decision]
- **Impact if wrong**: [consequence]
- **Evidence and limitations**: [confirmed(<source>); unverified or absent evidence]
- **Unresolved decision**: [decision] — owner: [owner] — affected slice: [slice]
- **Approval sought**: [exact approval and authority]
- **Independently ready slices**: [slices that can proceed without the unresolved decision]

## 2. Outcome And Guardrails

- **Business objective ref**: [BRD-OBJ-001]
- **Problem and outcome**: [pain solved; observable outcome]
- **Primary metric**: [metric + target + date]
- **Guardrails**: [what must not regress]

## 3. Scope And Non-Goals

- **Scope fence**: [what the approval covers]
- **In scope**: [committed capabilities]
- **Non-goals**: [explicit exclusions]
- **Owned gaps** (extension: unclassified capability or missing input): gap(<id>, <owner>, <required input>)

## 4. Requirements And Acceptance Criteria

<!-- Canonical definitions: one row per requirement and one row per acceptance criterion. Do not restate either elsewhere; the verification lane lives only in the AC row. -->

| Req ID  | Requirement       | Owner   | Priority | Status              | BRD objective |
| ------- | ----------------- | ------- | -------- | ------------------- | ------------- |
| REQ-001 | [What must exist] | [owner] | P0/P1/P2 | Draft/Approved/Done | BRD-OBJ-001   |

| AC ID  | Req ID  | Given     | When     | Then                | Owner   | Verification lane             |
| ------ | ------- | --------- | -------- | ------------------- | ------- | ----------------------------- |
| AC-001 | REQ-001 | [context] | [action] | [observable result] | [owner] | [unit/integration/E2E/manual] |

## 5. Open Consequential Decisions

| Decision   | Owner   | Affected slice | Consequence if wrong | Required input / approval |
| ---------- | ------- | -------------- | -------------------- | ------------------------- |
| [decision] | [owner] | [slice]        | [consequence]        | [input or approval ref]   |

## 6. Extensions

Include an extension only when its trigger applies. Omitting an applicable extension is an owned blocker, never silent scope loss.

| Trigger                                                                     | Required extension                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------- |
| Substantial or multi-slice scope                                            | Capability inventory (verb-object, containment tree) |
| Interacting conditions or multi-actor handoffs the AC rows cannot resolve     | Flows and decision tables                           |
| Persona or journey insight beyond the requirement text                       | Personas, JTBD, use cases                           |
| Telemetry, rollout, migration, or support commitments in approved scope      | Analytics and rollout                               |
| Sensitive change, or a requirement revision                                  | Risks, change impact, refreshed approvals           |
| New scope after approval                                                    | Change log naming affected REQ/AC/evidence          |

## 7. References

- **Run record**: `artifacts/runs/[slug]/[run-id].json` (Outcome RunRecord v1; schema-valid is not an approval)
- **SRS**: `docs/srs/srs-[slug].md` (only when technical decisions or contracts need an explicit design)
- **Evidence**: [approved ticket, decision record, measurement source]
