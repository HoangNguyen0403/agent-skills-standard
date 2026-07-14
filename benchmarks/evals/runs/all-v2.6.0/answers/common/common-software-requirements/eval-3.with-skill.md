# Technical Design Gate: Missing PRD Acceptance Criteria

## Decision

Blocked. The request asks for technical implementation design, but the PRD has no `AC-*` IDs. Under the software-requirements standard, implementation scope must not be inferred from code or invented from an underspecified product request.

## Missing trace inputs

The following must be supplied or approved before an SRS/technical design can be baselined:

| Required input | Current state | Why it is required |
| --- | --- | --- |
| `BRD-OBJ-*` | Missing | Establishes the business outcome and scope boundary |
| `REQ-*` | Missing or unlinked | Defines the product requirement being realized |
| `AC-*` | Missing | Defines observable success and failure behavior |
| Actors, permissions, and session goal | Missing | Prevents ambiguous flows and unauthorized behavior |
| Interfaces and dependencies | Missing | Enables request, response, error, timeout, and event contracts |
| NFR thresholds | Missing | Makes performance, availability, security, and scale testable |

## Safe next action

Return the PRD to product/BA for an acceptance-criteria baseline. Each criterion should have a stable ID and specify trigger, inputs, validation, observable output, negative path, permissions, and measurable constraints. Then map:

`BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> test evidence`

## What cannot be responsibly designed yet

Do not select retry limits, timeout budgets, data schemas, API status codes, persistence models, rollout strategy, or security controls as approved implementation requirements without the missing acceptance criteria and source dependencies. Any values proposed now would be assumptions, not traceable requirements.

## Readiness checklist

- [ ] PRD has stable `REQ-*` identifiers.
- [ ] Every in-scope behavior has an `AC-*` identifier.
- [ ] Normal, alternate, and exception flows are defined per actor and goal.
- [ ] API/event/storage contracts and external timeout behavior are identified.
- [ ] NFRs have numeric thresholds and measurement methods.
- [ ] Permissions, privacy, migration, and compatibility constraints are approved.
- [ ] Each resulting `SRS-*` maps to a verification lane and evidence artifact.

**Outcome report:** `feature_status=Blocked`; completed evidence: none; decision needed: product/BA must provide and approve the trace inputs above. Recommended next workflow: requirements discovery/PRD update, followed by SRS design once the AC baseline exists.

