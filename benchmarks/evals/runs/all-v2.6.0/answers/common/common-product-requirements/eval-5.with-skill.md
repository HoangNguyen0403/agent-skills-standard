# Pre-Development Feature Plan

`feature_status: Discovery — not implementation-ready`

Assumptions: the feature name, BRD objective, personas, business metric, and exact behavior are TBD. Planning covers web and mobile until the channel decision is confirmed. Offline behavior is assumed out of scope unless required.

## Discovery decisions required

1. What outcome?

   a) Increase revenue/conversion  
   b) Reduce operational effort/cost  
   c) Improve user retention/satisfaction

2. Which channels?

   a) Web  
   b) Mobile  
   c) Web and mobile

3. Primary persona/JTBD?

   a) End customer completing a task  
   b) Operations/admin user managing the task  
   c) Both

4. Rollout?

   a) Internal pilot, then staged release  
   b) Feature flag with percentage rollout  
   c) Immediate full release

5. Offline mode?

   a) Required  
   b) Not required  
   c) TBD after technical assessment

## Product scope

Create a PRD at:

`docs/prd/prd-[slug].md`

The `[slug]` must match `docs/brd/brd-[slug].md`. If no BRD exists, create or approve the BRD objective before implementation.

### User stories

- As a `[specific persona]`, I want to `[perform action]`, so that `[measurable business value]`.
- As a `[specific persona]`, I want to see `[result/state]`, so that `[user outcome]`.

Each story must pass the INVEST self-check: independent, negotiable, valuable, estimable, small, and testable.

## Requirements and acceptance criteria

| ID | Requirement | Owner | Status | Priority | Verification lane | BRD objective |
|---|---|---|---|---|---|---|
| REQ-001 | Define the primary feature flow for `[persona]` | Product | TBD | P0 | Manual + E2E | OBJ-TBD |
| REQ-002 | Define success, zero, loading, and error states | Product | TBD | P0 | Manual UI | OBJ-TBD |
| REQ-003 | Define permissions and validation rules | Product/Engineering | TBD | P0 | API + security | OBJ-TBD |
| REQ-004 | Define analytics events and rollout guardrails | Product/Data | TBD | P1 | Analytics QA | OBJ-TBD |

Example acceptance criteria:

- `AC-001` — Given an eligible `[persona]`, when they start the feature flow, then the system displays the required inputs and available actions.
- `AC-002` — Given valid input, when the persona submits, then the expected result is shown and the success event is recorded.
- `AC-003` — Given invalid or incomplete input, when submission is attempted, then validation is shown without data loss.
- `AC-004` — Given no available data, when the feature loads, then a defined zero state is displayed.
- `AC-005` — Given an API or network failure, when the feature loads or submits, then a recoverable error state and retry action are displayed.
- `AC-006` — Given an unauthorized persona, when access is attempted, then the feature is denied without exposing protected data.

Every `AC-*` must map to one `REQ-*` and one BRD objective.

## Non-functional requirements

- Performance: define measurable targets, including initial load and primary action response time; proposed target is `<200 ms` for local interaction feedback and a documented API SLA.
- Security: authentication, authorization, input validation, sensitive-data handling, auditability, and abuse/rate-limit requirements.
- Offline: explicitly mark supported, unsupported, or TBD; define sync/conflict behavior if required.
- Reliability: retry, timeout, idempotency, and failure-recovery behavior.
- Accessibility and localization: confirm applicable standards and supported locales.

## Product and technical impact questions

- Database schema or migration impact: TBD.
- API additions or contract changes: TBD.
- Existing integrations or permissions affected: TBD.
- Backward compatibility and data migration: TBD.
- Design deliverables and responsive states: TBD.

`design-solution` is required if the feature introduces new module boundaries, API contracts, database behavior, or non-trivial integration design.

## Analytics and operations

Define:

- `feature_viewed`
- `feature_started`
- `feature_submitted`
- `feature_succeeded`
- `feature_failed`
- validation and authorization failure events

Each event needs a schema, owner, privacy classification, and success metric.

Define rollout flags, monitoring dashboards, alert thresholds, support documentation, escalation path, and rollback criteria.

## Offshore RACI

| Activity | Product/PM | BA | Engineering | QA/Release |
|---|---|---|---|---|
| Business objective and success metric | A/R | C | I | I |
| User flows and requirements | A | R | C | C |
| UX states and content | A/R | C | C | C |
| Technical impact assessment | C | C | A/R | C |
| Acceptance criteria | A | R | C | R |
| Test design and execution | C | C | C | A/R |
| Release, monitoring, rollback | A | C | R | A/R |
| Final validation/sign-off | A | C | C | R |

Name the individuals for Product owner, Engineering owner, QA/release owner, and requirement owners before development starts.

## Scope boundaries

In scope: confirmed primary persona flow, validation, permissions, zero/error states, analytics, test coverage, rollout, and support readiness.

Out of scope unless approved: unrelated redesign, broad data-model cleanup, new integrations, historical data migration, advanced offline synchronization, and performance optimization outside this feature.

## Readiness gate

Before handoff, complete `implementation-readiness` and confirm:

- BRD objective and business metric approved.
- All functional flows, edge cases, and negative paths documented.
- Every requirement has `REQ-*`, owner, status, priority, and linked objective.
- Every acceptance criterion has `AC-*` traceability.
- Product, Engineering, and QA/release owners are named.
- UX, API, database, security, analytics, rollout, and support impacts are resolved or explicitly marked TBD with an owner and decision date.
- Design and `design-solution` dependency is decided.
- QA has a verification lane for every acceptance criterion.

`feature_status` becomes `Ready for implementation` only after these items are approved.
