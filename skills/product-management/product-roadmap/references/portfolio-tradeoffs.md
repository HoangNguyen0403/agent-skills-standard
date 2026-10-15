# Portfolio Trade-offs and Multi-Initiative Governance

## 1. Single Canonical Ledger Architecture

In multi-product or multi-initiative environments, maintaining coherent evidence requires strict architectural boundaries.

### The Anti-Pattern: Dual Mutable Ledgers

When organizations manage multiple initiatives, a common failure mode is creating a secondary "portfolio ledger" that duplicates records from individual initiative ledgers. This creates:
- Divergent snapshot revisions and synchronization conflicts.
- Unclear lines of authority and decision ownership.
- Accidental mutations in portfolio views that invalidate lower-level proof chains.

### The Canonical Solution: Read-Only Portfolio Projections

Under the normative contract (`t01-v2` §2):
1. **One Ledger per Initiative**: Each initiative retains its own system of record at `docs/product/<slug>/evidence.json`.
2. **Explicit Reference Pointers**: Portfolio overview artifacts (e.g., `docs/product/portfolio-view.md`) are human-readable, read-only markdown projections.
3. **Exact Revision Binding**: Portfolio views cite each initiative by its canonical `slug` and exact `revision`. They never hold duplicate, independently editable JSON records.
4. **No Cross-Ledger Resolution**: The evidence validator evaluates single ledgers within an authority root; it does not perform implicit cross-ledger lookups or automatic resolution.

## 2. Managing Overlapping Initiatives & Shared Scope

When multiple initiatives compete for shared customer segments, market windows, or architecture:

### Contention Resolution

1. **Strategic Authority Arbitration**: Contradictions between competing initiatives are resolved by referencing the shared root strategic authority (`strategy_authority`).
   - *Strategy Gap XOR Invariant*: If corporate strategy is conflicting or absent, the ledger root enforces the strict XOR rule: `strategy_authority` must be `null` and `strategy_gap` must contain a non-empty explanation. A ledger may never declare both non-null or both null. Under a strategy gap, roadmap priorities remain proposal-only (`proposal_only`).
2. **Resource & Capacity Contention**: If Initiative Alpha and Initiative Beta require the same specialized engineering or design resources, the roadmap decision must explicitly record which initiative holds priority and which is paused or deferred.
3. **Shared Customer Cohorts**: When multiple experiments target the same user cohort, exposure conflicts must be audited. Concurrent uncoordinated experiments on the same cohort pollute counterfactual baselines and invalidate measurement.

## 3. Separation of Product Discovery and Delivery Traces

A fundamental invariant of the `agent-skills-standard` SDLC architecture is the separation of product discovery evidence from engineering delivery traces.

### Delivery Traces (Outcome v1)

- Artifacts: PRDs, SRS task lists, and requirement traces in engineering workflows.
- Closed Delivery Status Enum (`feature_status`):
  `not_started | requirements_ready | design_ready | partially_implemented | implemented | verified | released | blocked`
  *Rule*: `draft` and `reviewed` are specification or review stages, NOT delivery statuses.
- Identifier Schemas:
  - `BRD-OBJ-xxx`: Business requirements objectives.
  - `REQ-xxx`: Product functional and non-functional requirements.
  - `AC-xxx`: Acceptance criteria.
  - `SRS-xxx`: Software requirements specifications.
- Purpose: Verifies whether software was constructed correctly and deployed safely according to engineering specifications.

### Product Evidence Ledgers

- Artifacts: `docs/product/<slug>/evidence.json`.
- Identifier Schemas: `SRC`, `CLM`, `OPP`, `HYP`, `EXP`, `INV`, `DEC`, `MET`, `REV`.
- Closed Product State Enum: `unvalidated | validating | validated_for_scope | invalidated | inconclusive | not_applicable`.
- Purpose: Verifies whether the software solves a real customer problem, achieves expected business outcomes, and justified its investment.

### Integration Boundary

- Bridges (`bridges`) connect product decisions (`DEC`) to delivery authorities (`AUTH`) containing `BRD-OBJ`, `REQ`, `AC`, or `SRS` declarations.
- Delivery trackers must never have their requirement arrays polluted with product discovery IDs.
- A feature may be marked `released` in engineering delivery traces while its corresponding product evidence record in `REV` remains `inconclusive`.
