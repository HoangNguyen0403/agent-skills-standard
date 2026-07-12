# Offshore Feature Planning Gate

Before development starts, create an approved PRD from the business objective and success metric. Offshore execution increases the need for explicit ownership, handoff evidence, time-zone-safe decisions, and verification—not for guessing missing product intent.

## Discovery questions

1. What is the feature, primary persona/JTBD, and business outcome? a) Provide approved BRD objective and metric b) Schedule product discovery c) Defer development.
2. What delivery scope? a) Web b) Mobile c) Both; specify supported versions, markets, accessibility, and localization.
3. What priority and rollout? a) MVP behind a flag b) Beta cohort c) Full release; define guardrails, rollback owner, and support readiness.
4. Who owns decisions and acceptance? a) Product owner b) Engineering owner c) QA/release owner; name timezone-safe escalation and response expectations.
5. What dependencies and constraints exist? a) None confirmed b) External/API/vendor c) Compliance, data, migration, or operational dependencies; identify each.

## Planning outputs before dev

- PRD at `docs/prd/prd-[slug].md`, using the BRD slug and marking unresolved items `TBD`.
- `OBJ-*` business objective and stable `REQ-*` requirements, each with owner, status, priority, and objective link.
- `AC-*` Given/When/Then criteria for happy, edge, negative, zero, error, permission, offline, and recovery states; each mapped to a requirement and verification lane.
- Analytics events, success/guardrail metrics, rollout and rollback, support/runbook needs, security/privacy, performance, accessibility, and out-of-scope decisions.
- A delivery slice list that names its REQ/AC IDs and owner, plus the decision on whether `design-solution`/SRS is required.

## Handoff gate

Do not start dev until product approves scope and priorities, all critical ACs are testable, dependencies are assigned, and the implementation-readiness check passes. After development, verify against the PRD and criteria; an implementation without traceable AC evidence remains partial/unverified.

