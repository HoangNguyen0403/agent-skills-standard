# Retrospective PRD and Acceptance Criteria for an Existing Feature

## Purpose
Document what the implemented feature is intended to do, what evidence confirms it, and what remains ambiguous. This is a requirements-recovery exercise, not permission to change code.

## Evidence-first process

Collect the released behavior, UI/API contracts, product decisions, user feedback, telemetry, tests, support cases, and implementation notes. Separate observed behavior from intended behavior and assumptions. Identify the feature owner and obtain approval for unresolved product decisions before declaring the PRD authoritative.

## Recovered PRD template

Problem: [the user or business problem, supported by evidence].

Users and outcome: [actors] can [capability] so that [measurable outcome].

In scope: [confirmed capabilities, states, roles, platforms, and integrations].

Out of scope: [explicit exclusions and adjacent requests].

Constraints: [security, privacy, accessibility, performance, regulatory, operational, and compatibility requirements].

Dependencies: [services, data, permissions, configuration, and rollout controls].

Success measures: [baseline, target, timeframe, owner, and data source].

## Acceptance criteria

Write atomic, testable criteria tied to evidence. Each criterion should name a precondition, action, expected result, and relevant actor/state. Cover the happy path, validation, authorization, empty/loading/error states, retries/idempotency, accessibility, analytics, and rollback where applicable.

Example format:

- AC-01: Given an authorized user with valid input, when the user submits the feature flow, then the system persists one valid result and presents the documented success state.
- AC-02: Given invalid or incomplete input, when submission occurs, then no mutation occurs, each actionable error is identified, and the user can correct it.
- AC-03: Given an unauthorized user, when the protected capability is requested, then access is denied without disclosing protected data.
- AC-04: Given a transient failure or repeated request, when the operation is retried, then behavior follows the documented retry/idempotency contract without duplicate side effects.

## Sign-off and gap register

Trace each criterion to implementation evidence and a test or production observation. Mark each as confirmed, partially confirmed, or unknown. Record discrepancies as product decisions or defects; do not silently rewrite requirements to match accidental behavior. Obtain product, engineering, QA, security/privacy, and operations sign-off as applicable, then publish the version, owner, date, and change history.

