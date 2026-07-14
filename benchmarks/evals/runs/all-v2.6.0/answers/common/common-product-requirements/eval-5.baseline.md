## Feature Planning Brief

### Assumptions

- The feature scope and business objective are not yet defined.
- The offshore team will deliver implementation, tests, documentation, and deployment support.
- A product owner, business approver, and technical owner are available for decisions.
- Work will be delivered asynchronously across time zones.

### 1. Discovery and alignment

Before development starts, confirm:

- Business problem and expected user outcome
- Target users, roles, and permissions
- In-scope and explicitly out-of-scope behavior
- User journey and supported platforms
- Dependencies, integrations, data changes, and reporting needs
- Security, privacy, accessibility, performance, and localization requirements
- Success metrics and release constraints

Required output: approved feature brief with measurable acceptance criteria.

### 2. Requirements

Create a PRD containing:

- User stories and priority
- Functional requirements
- Edge cases and error states
- Permission and actor matrix
- Validation rules
- API and data-contract expectations
- Analytics and audit requirements
- Non-functional requirements
- Acceptance criteria written as testable scenarios

Any unresolved requirement becomes a documented decision or blocker with an owner and due date.

### 3. Technical design

Prepare and review an implementation design covering:

- Affected modules and ownership boundaries
- Frontend, backend, database, and integration changes
- API endpoints, request/response schemas, and error codes
- Data migration and backward compatibility
- Feature flags and rollout strategy
- Observability: logs, metrics, traces, and alerts
- Security controls and threat considerations
- Rollback approach

Technical approval is required before estimation is finalized.

### 4. Delivery plan

Break the work into independently reviewable slices:

1. Contracts and data model
2. Backend behavior
3. Frontend or client behavior
4. Permissions and error handling
5. Automated tests
6. Documentation and operational readiness
7. Deployment and rollout

For each slice, define owner, dependency, estimate, acceptance criteria, and review requirements. Keep tasks small enough to complete within one delivery cycle.

### 5. Offshore collaboration model

- Maintain one authoritative requirements document.
- Record decisions in writing; do not rely on meeting-only agreements.
- Provide examples for ambiguous behavior and timezone-sensitive deadlines.
- Schedule overlap hours for refinement, design review, and escalation.
- Use daily written status updates: completed, next, blocked, decision needed.
- Require handoff notes for unfinished work.
- Nominate one product and one technical decision-maker.
- Agree on response-time expectations for blockers and reviews.

### 6. Quality and release readiness

Before development begins, confirm:

- Acceptance criteria map to test cases.
- Test data and environments are available.
- Automated test scope is agreed.
- Accessibility, security, performance, and regression coverage are defined.
- Monitoring and support ownership are assigned.
- Release notes, user documentation, and rollback steps are prepared.

### Definition of ready

Development may start only when the feature has:

- Approved scope and UX
- Testable acceptance criteria
- Reviewed technical design
- Identified dependencies and risks
- Estimated implementation slices
- Assigned owners
- Available environments and test data
- Agreed rollout and rollback strategy
- No unresolved blocker affecting the first development slice

### Key risks

- Ambiguous requirements causing offshore rework
- Delayed decisions across time zones
- Hidden integration or data-migration dependencies
- Inconsistent interpretation of acceptance criteria
- Insufficient overlap for reviews and escalation

The immediate next step is a requirements workshop to define the business goal, users, scope, acceptance criteria, and technical constraints.
