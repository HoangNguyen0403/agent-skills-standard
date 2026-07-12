# Existing Implementation Without PRD/Acceptance Criteria

Treat the feature as partial and unverified. Existing code is evidence of implementation, not evidence that the intended product outcome, scope, or behavior is correct.

## Required recovery path

1. Identify the specific feature, persona, business objective, baseline, target metric, supported platforms, and release scope. Ask: a) reconstruct from an approved BRD b) interview product/support/operations c) pause release until the owner supplies them.
2. Inventory the implemented user flows and observable states without changing source. Record happy, empty, loading, error, permission, offline, duplicate, and recovery paths.
3. Assign stable `OBJ-*`, `REQ-*`, and `AC-*` IDs. Map every criterion to a requirement and business objective; assign owner, priority, status, and verification lane.
4. Validate product gaps against analytics, security/privacy, performance, accessibility, rollout, support, and out-of-scope decisions. Route technical contracts to SRS/design-solution rather than embedding implementation detail in the PRD.
5. Run implementation-readiness review. Do not call the feature complete or hand it off until missing ACs, owners, evidence, and decisions are resolved.

## Evidence-based acceptance criterion format

**Given** [specific persona, state, and precondition], **when** [user action or system event], **then** [observable outcome and measurable guardrail]. Add negative and edge criteria, not only the path the current code happens to support. Mark unknowns `TBD`; do not reverse-engineer undocumented behavior into an assumed requirement. The resulting PRD should be a living system of record with traceability, rollout/ops readiness, decisions, and changelog.

