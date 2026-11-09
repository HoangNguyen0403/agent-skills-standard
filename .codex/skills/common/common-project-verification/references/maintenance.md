# Project Verification Maintenance & Freshness Contract

Specification for proof records, freshness invalidation, maintenance workflows, and lifecycle gate integration.

## 1. Verification Proof Record Schema

Each verification execution must attach per-journey proof records to the existing task verification report. Do not create a separate ledger or database.

A complete proof record contains:

| Field | Description | Invariant |
| --- | --- | --- |
| `journey_ref` | Stable journey name or path from kit map | Must reference mapped journey |
| `criterion_ref` | Raw canonical AC identifier (e.g., `AC-01`, `AC-02`) | Must preserve exact source tokens |
| `source_revision` | Resolvable canonical locator + immutable revision or digest (e.g., commit SHA, content SHA-256 of uncommitted spec, or external version) | Does not require committed Git alone |
| `build_identity` | Build hash, container digest, or package version | Actual deployed artifact identity |
| `dirty_identity` | Digest of uncommitted or working-tree changes | Git HEAD alone is insufficient |
| `recipe_digest` | SHA-256 of the journey recipe and kit README | Binds proof to exact instructions |
| `harness_digest` | SHA-256 of test scripts and helper utilities | Binds proof to driver code |
| `dependency_refs`| Scoped list of components, endpoints, and data paths | Basis for freshness evaluation |
| `action_taken` | Exact CLI command, script invocation, or driver step | Verifiable and reproducible |
| `observed_result`| Observed exit code, response body, UI state, side effects | Grounded in actual execution |
| `evidence_path` | Relative path to logs, traces, or screenshots | Files must exist and be accessible |
| `instance_owner` | Assigned driver owner identifier or session ID | Records ownership; does not enforce exclusivity |
| `source_review_status` | Status of source dependency inspection | `REVIEWED`, `STALE`, or `UNREVIEWED` |
| `live_coverage_status` | Status of live execution attempt | `COVERED`, `UNEXERCISED`, or `UNREACHABLE` |
| `prerequisite_gaps` | Inaccessible prerequisite details with named accountable owner | Missing dependencies explicitly identified |
| `limitations` | Declared environment or execution boundaries | Constraints preventing full execution |
| `cleanup_status` | Status verifying process exit and evidence survival | Evidence must survive cleanup |
| `disposition` | `PROVEN`, `STALE`, `BLOCKED`, or `FAIL` | Missing fields mean UNKNOWN |

## 2. Evidence Freshness & Invalidation Rules

Evidence freshness determines whether historical proof remains valid:

- **Dependency intersection**: Source review must identify all dependencies for each journey, including shared launch scripts, doctor checks, seed data, and helper harnesses.
- **Trigger for invalidation**: Any modification intersecting a journey's source dependencies, canonical criteria, recipe, or target build marks that journey's proof **STALE**.
- **Stale proof requires reproof**: A stale proof record cannot produce a `PASS` verdict. The journey must be re-driven live.
- **Build divergence**: Never assume two distinct builds behave identically. Build differences must be reconciled through explicit source/dependency diffing before reusing proof.
- **Unbounded impact**: If shared dependency impact cannot be bounded, all journeys depending on that shared component must be marked stale. Unrelated projects or isolated features remain unaffected.
- **Unrelated proof retention**: Unchanged, independent journeys retain their proof provided the source and build identity basis is documented.
- **Timestamp rejection**: Elapsed time alone is neither proof of validity nor sufficient cause for blanket invalidation. Timestamp freshness alone is strictly rejected.

## 3. Maintenance Workflow & Discrepancy Classification

Maintenance reconciles verification kits with evolving applications:

### Workflow Steps
1. **Scope selection**: Explicitly declare scope: whole application map or named journeys.
2. **Source review**: Review changes across criteria, recipes, harnesses, and application source. Record `source_review_status` for each journey.
3. **Live execution**: Live-drive every journey within the declared scope for which coverage is claimed. Record `live_coverage_status`. Unexecuted recipes remain unproven.
4. **Discrepancy triage**: When an unexpected result occurs, classify it into exactly one of three categories:

### Discrepancy Classification
- **Documentation drift**: The application satisfies the approved canonical criteria, but the journey map, selectors, or recipe instructions are outdated.
  - *Action*: Update the journey recipe or map. Re-drive the journey live before claiming a changed outcome.
- **Harness failure**: The test driver, helper, or environment harness fails to reach or interact with a working application path.
  - *Action*: Repair the harness or report the run as blocked. Never infer a product PASS from source inspection alone.
- **Product regression**: The application violates an approved canonical acceptance criterion.
  - *Action*: Report a product defect with evidence. Route remediation separately. **Never alter application code or weaken criteria during kit maintenance** to make the maintenance run pass.

### Maintenance Outcome States
Both clean and changed outcomes require all required in-scope coverage to be complete. If any required journey cannot be executed or is blocked, the outcome is blocked even if other corrections were proven.

- **`clean`**: All required journeys in scope completed live with expected observable results and no discrepancies found.
- **`changed`**: All required journeys in scope completed live, discrepancies were resolved in the map or harness, and every claimed correction was re-driven live with retained proof. Requires full required in-scope coverage; if any required journey is unexercised or blocked, report `blocked`.
- **`blocked`**: Required journeys could not be completed due to missing prerequisites, environment gaps, or driver failures. The exact limitation, inaccessible prerequisite, and accountable owner must be explicitly named; incomplete required coverage cannot be reported as clean or changed.

## 4. Lifecycle Gate Integration

Integration rules for consumers:

- **Implementation readiness**: Consumes kit availability and prerequisite checks. If required target access, data, or driver is missing, report the affected slice as blocked with the accountable owner without blocking unrelated work.
- **Verification execution**: Consumes proof records and evaluates freshness. Stale proof cannot yield `PASS`. Product defects yield `FAIL`. Missing drivers or authority yield `BLOCKED`.
- **Authority separation**: A verification kit provides operational instructions, not authority. Technical verification confirms software behavior; it does not grant business acceptance or deployment authorization.
