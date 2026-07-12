# Offshore Feature Planning Brief

## Objective
Plan and align the feature before development starts so a distributed team can execute with minimal ambiguity, predictable handoffs, and traceable acceptance. The plan must be approved before coding begins.

## Pre-development gates

1. Product/BA confirms the problem, target users, business value, scope boundaries, assumptions, success metrics, and atomic acceptance criteria.
2. UX confirms flows, states, content, accessibility, localization, and responsive behavior where applicable.
3. Engineering produces the technical design, interfaces, data changes, dependencies, security/privacy considerations, observability, migration and rollback plan.
4. QA maps every acceptance criterion to test coverage, environments, test data, automation/manual ownership, and entry/exit criteria.
5. Delivery confirms estimates, milestones, time-zone overlap, named owners, escalation path, release window, and stakeholder sign-off.

## Work package and handoffs

Create one source-of-truth brief containing IDs for requirements, decisions, risks, and interfaces. Split work into independently reviewable slices: contract/schema, backend capability, frontend experience, integrations, telemetry, tests, documentation, and release. Each slice must specify owner, inputs, output artifact, dependencies, definition of ready, definition of done, reviewer, and handoff time in UTC.

Use written handoffs with a concise status, changed files or environments, evidence, known limitations, and next action. Avoid relying on local-time meetings or undocumented tribal knowledge. Maintain an open-questions log with decision owner and due date; unresolved blocking questions stop the affected slice rather than becoming implicit assumptions.

## Acceptance and quality

The feature is ready for development only when scope, UX, technical design, security review needs, test strategy, environments, and acceptance criteria are approved. It is done only when implementation, tests, documentation, telemetry, migration, accessibility/security checks, and release evidence satisfy the approved criteria. Include negative paths, authorization, retries, idempotency, empty/loading/error states, and operational alerts.

## Delivery cadence

Run a kickoff with recorded decisions, then short async daily updates covering progress, evidence, next step, and blockers. Use overlap hours for dependency resolution and review. Hold a mid-build contract review, a QA readiness review before test execution, a release go/no-go review, and a post-release validation. Define escalation thresholds for blocked work, integration failure, scope change, and missed milestone.

## Risks and rollback

Track dependency, timezone, environment, data, security, and requirement risks with probability, impact, owner, mitigation, and trigger. Use feature flags or staged rollout where feasible. Define rollback authority, steps, data-reconciliation behavior, monitoring, and customer/support communication before release.

## Sign-off checklist

- Product owner approves problem, scope, metrics, and acceptance criteria.
- Design/UX approves user-visible behavior and accessibility.
- Engineering approves architecture, contracts, and operational readiness.
- QA approves coverage and test data/environment readiness.
- Security/privacy approves required controls.
- Delivery owner approves schedule, owners, handoffs, and release/rollback plan.

