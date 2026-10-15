# Requirements Modeling Guide

Shared reference for substantial scope decomposition, scenario completeness, view selection, and change impact.

## 1. Applicability & Sizing Gate

- **On-Demand Loading**: Load this reference when feature discovery involves substantial scope, multi-actor workflows, interacting rules, or multiple delivery slices.
- **Low-Risk Equivalence**: Sufficiently specified routine fixes, maintenance, or single-component changes (with approved behavioral ACs, scope fence, accountable owner, and verification lane) do **not** require scope trees, formal modeling, or full documents. Preserve direct readiness for low-risk work.
- **Sensitive-Change Floor**: Changes affecting authentication, financial transactions, data integrity, or trust boundaries require explicit modeling and approval regardless of perceived size.

## 2. Scope Inventory & Decomposition Tree

Structure complex scope into an unambiguous capability hierarchy before drafting detailed requirements.

### Principles

- **Verb-Object Naming**: Name every capability node using an active verb and concrete object (e.g., `Capture Application`, `Assess Collateral`, `Disburse Funds`, `Collect Payment`).
- **Single Containment Parent**: Every node belongs to exactly one parent capability in the hierarchy. No multi-parent ownership.
- **Leaf Classification**: Every leaf capability must be explicitly classified:
  - `in_scope`: Committed for the current release slice.
  - `deferred`: Acknowledged capability postponed to a future milestone.
  - `excluded`: Explicitly outside system or release boundaries.
- **Decomposition Stop Rule**: Stop decomposing when all six attributes are clear enough to estimate effort and assign a single implementation owner:
  1. **Actor**: Who or what triggers/performs the capability.
  2. **Trigger**: Specific event, request, or condition initiating execution.
  3. **Intended Result**: Observable business or user outcome produced.
  4. **Rules & Exceptions**: Governing business logic, validation rules, and error paths.
  5. **Scope Boundary**: What is strictly included versus excluded.
  6. **Verification Lane**: Concrete method for testing and proving the behavior.

### Traceability & Gap Accounting

- Every `in_scope` leaf must map directly to:
  - An existing requirement or acceptance criterion (`REQ-*`, `AC-*`), OR
  - An explicit owned gap: `gap(<id>, <owner>, <required input>)`.
- **Completeness Rule**: Never silently omit an unmentioned domain capability (e.g., overdue handling in lending, transaction rollback in disbursement), and never silently implement unapproved capabilities. Raise omissions as owned decisions for explicit disposition (`in_scope`, `deferred`, or `excluded`).

### Canonical Shared Rules & Functions

When logic is invoked across multiple flows (e.g., `Verify Customer Identity` invoked in onboarding intake and fund disbursement):
- Define the rule or function canonically **once**.
- Flows must reference the canonical definition by ID or name (`ref: <canonical-id>`).
- **Never duplicate or fork definitions** across flows. Conflicting duplicates create specification drift.

## 3. Rules, Scenarios, and Question Discipline

- **Question Discipline**: Draft first from supplied evidence; ask at most 3 consequential questions per round per `common-decision-discipline`. Provide recommended defaults and 2–3 concrete options. Never re-ask settled facts.
- **Unknowns Classification**:
  - **Confirmed Evidence**: `confirmed(<source-or-path>)`.
  - **Non-Critical Assumptions**: `assumed(<hypothesis>)` — explicit, testable, and does not block progress.
  - **Blocking Decisions**: `blocked(<slice>, <owner>, <required input>)` — blocks only its affected slices; no unowned `TBD` at handoff.
- **Behavior Atomicity**: One observable behavior per AC across happy, edge, and negative paths. Multiple necessary preconditions are permitted (do not split solely on 'And').
- **Combinatorial Logic**: Interacting conditions use decision tables and owner decisions rather than silently inventing business policy or selecting arbitrary branches.

## 4. View Selection Table

Select visual or structured views based strictly on the question being addressed. Diagrams remain optional when prose or tables answer the question precisely and unambiguously.

| Question / Need | Representation / View | Primary Purpose | Optional Diagram Type |
| :--- | :--- | :--- | :--- |
| What capabilities are included, deferred, or excluded? | **Scope Tree** | Capability bounds, hierarchy, and completeness | Text hierarchy / indentation |
| Who is responsible for what, in what order? | **Process Flow** | End-to-end responsibilities and step sequence | Mermaid flowchart (inline) |
| Which combinations of interacting rules determine outcomes? | **Decision Table** | Combinatorial conditions and rule coverage | Markdown truth table |
| What valid states and transitions does an entity undergo? | **State Lifecycle** | Lifecycle states, events, and terminal states | `state` spec (`common-architecture-diagramming`) |
| How do actors and system components interact over time? | **Sequence** | Call protocols, sync/async messages, failure paths | `sequence` spec (`common-architecture-diagramming`) |
| In what order can implementation work be scheduled? | **Delivery Graph** | Schedulable prerequisite dependencies (business loops != work deps) | Schedulable DAG / ordered slice list |

### Drawing Capabilities & Invariants

- **Existing Capability Reuse**:
  - Architecture views: C4 (`context`, `container`, `component`, `deployment`), `dataflow`, `sequence`, `state`, and `erd` use `common-architecture-diagramming` (`spec.json` rendered to `.drawio`).
  - Business workflows: Inline Mermaid flowcharts within markdown specifications.
  - No new renderer, activity diagram, or BPMN tool is missing or required.
- **Drawing Authority**: `spec.json` is the semantic source of truth; `.drawio` is editable presentation. Diagram appearance never proves requirement completeness.
- **Verifiable Invariants**: Use categorical invariants for security and access controls; use numeric thresholds for performance SLAs; never fabricate metrics or domain policy (e.g., lending limits, OTP expiry, authorization rules).

## 5. Scope Completeness & Overlap Review

Before finalizing specifications or handoff:
1. **Scope Completeness**: Verify every capability in the domain scope is classified (`in_scope`, `deferred`, `excluded`). Any gap must be recorded as an owned decision, not silently ignored or added.
2. **Overlap Review**: Verify shared functions and business rules are defined once canonically and referenced across flows without contradictory duplicate definitions.
3. **Atomicity Check**: Ensure each AC validates one observable outcome, with necessary preconditions grouped together.

## 6. Scoped Change-Impact Procedure

When a requirement, assumption, or constraint changes after initial approval:
1. **Carry Existing IDs**: Preserve existing `BRD-OBJ-*`, `REQ-*`, `AC-*`, and `SRS-*` identifiers. Never create a second requirement database or renumber settled items.
2. **Trace Impacted Artifacts**: Identify and record:
   - Affected acceptance criteria (`AC-*`).
   - Downstream contracts (API endpoints, schemas, interface definitions).
   - Governance approvals (owner sign-offs, gate criteria).
   - Verification evidence (test cases, walkthrough scripts).
3. **Bound the Review**:
   - Re-verify and update **only** the affected slices and linked artifacts.
   - Do **not** reopen settled decisions or unrelated requirements.
   - Enforce sensitive-change review floors if changes touch authentication, monetary flows, or data trust boundaries.
