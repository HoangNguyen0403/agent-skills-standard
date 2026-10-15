# Authority, Freshness, and Graph Roles

## 1. Authority Model and Revision Formats

Authorities represent external or repository governance artifacts:
- `id`: Unique identifier matching `^AUTH-[0-9]{3,}$`.
- `domain`: `strategy | business | requirements | technical | authorization`.
- `locator`:
  - `local`: POSIX relative path within canonical `--authority-root` and SHA256 digest. Authority revision is exactly `sha256:<64 lowercase hex>`.
  - `external`: HTTPS URL or URN validated as an identifier only. Revision is a non-empty immutable publisher token, not a record-revision token; requests never fetch remote content.
- `access`: `available | protected | unavailable`.
- `declared_ids`: Unique IDs declared by this authority (e.g. `BRD-OBJ-001`, `REQ-001`, `AC-001`, `SRS-001`).

### Local Declaration Scanning Rules

Current available local authorities are inspected directly from disk using bounded no-follow reads. A token is declared if:
1. It appears as an unfenced markdown heading starting with the ID (e.g. `# BRD-OBJ-001: Description` or `## REQ-001`).
2. It appears as the first ID following a bold ID field (e.g. `**ID**: REQ-001` or `**Objective ID**: BRD-OBJ-001`).
3. It forms the entire trimmed text of a markdown table's first cell (weak declaration).

A weak table declaration that duplicates an existing strong heading declaration is demoted to a reference. If an authority claims declared IDs not declared in the file, or if duplicate declarations exist in the file, validation emits a `BRIDGE_DECLARATION` structural error.

## 2. Freshness and Temporal Invalidation

Freshness captures the temporal validity of evidence:
- `status`: `current | stale | disputed | unknown`.
- `reviewed_at`: UTC instant when evidence was verified. Cannot be in the future relative to `asOf`.
- `expires_at`: UTC instant after which evidence becomes stale.
- `review_triggers`: Non-empty list of event conditions requiring re-review. Unique strings.

### Evaluation at `asOf`

At validation time, the validator evaluates each record against the provided `--as-of` instant:
- If `asOf >= expires_at`, the evidence is effectively stale (`STALE_EVIDENCE`). Equality at expiry is stale.
- Future timestamps for `reviewed_at`, `retrieved_at`, or `observed_at` are rejected as `INVALID_FIELD`.
- When critical claims or sources become stale or disputed, only consuming recorded decisions are added to `affected_decisions` (`OBSOLETE_BINDING` or `STALE_EVIDENCE`). Unaffected decisions remain valid.

## 3. Three Graph Relations

1. **Exact-Pair Resolution**: All references `{id, revision}` resolve against the disjoint union of current and historical snapshots. An absent ID is `DANGLING_REFERENCE`; an existing ID with a missing revision is `REFERENCE_REVISION`.
2. **Provenance DAG (`depends_on`)**: Directed graph representing explicit lineage dependencies. Must be strictly acyclic across current and historical records.
3. **Bounded Influence Traversal**: Evaluates support relationships using a non-recursive worklist of `(pairKey, role)` tuples. Traversal visits each `(pairKey, role)` once per candidate decision root (depth capped at 64).

### Graph Roles and Semantics

#### Evidence Role
Used for standard support evaluation:
- The consumed exact pair must be current. An old retained pair yields `OBSOLETE_BINDING`.
- Current effective freshness must be fresh (not stale, unknown, or disputed).
- Scope identity must match the consuming decision's scope (except for SRC provenance).
- Positive gates require supported states, completed experiments, and observed measurements.
- A recorded action gate requires an available current authority/access declaration for the selected decision, including when the declaration pair is missing or malformed.
- A `validated_for_scope` product state requires its exact current HYP pair; a retained older hypothesis cannot support that state.

#### Plan Role (F05)
Avoids lifecycle deadlocks when an experiment decision authorizes a planned experiment before execution:
- Applies **strictly and exclusively to EXP, HYP, and MET records**. Other kinds (SRC, CLM, OPP, INV) never receive a plan projection waiver.
- An archived pair may be used in plan role only when its frozen projection matches the current same-ID plan recursively:
   - EXP keeps the hypothesis, primary-metric, and guardrail target IDs and their compatible HYP/MET projections; method, eligibility, sample plan, rules, and every bound stay exact.
   - HYP keeps opportunity/claim pairs exact, primary-metric target ID and compatible MET projection, and prediction, mechanism, and disconfirmation exact.
   - MET keeps definition, unit, denominator, exact query/source and baseline-source pairs, query revision, baseline value/window, exception pair, comparison window, eligibility, target, guardrail, measurement owner, and review trigger.
   - `depends_on` compares as an unordered set of same-ID targets with recursively compatible EXP/HYP/MET projections. Non-plan references remain exact; target-ID equality alone is insufficient.
- A compatible projection uses the current entity's freshness and lifecycle support, never archived freshness.
- Plan role continues through HYP primary and EXP primary/guardrail METs, checking current query, baseline-source evidence, and every reached `baseline_exception` support edge. The helper DEC is evaluated under exception-role predicates; only the baseline source itself is waived.
- The experiment action gate applies lifecycle compatibility to a retained EXP only when the current EXP projection is equal, then validates current scope, status, selected authorization, bounds, and queried metrics. Material plan changes invalidate authorization.

#### Exception Role (F06)
Evaluates baseline exceptions without circular deadlocks:
- A baseline exception must be a current exact-pair, non-retired recorded release DEC with outcome `risk_accept`, same scope, explicit non-empty uncertainty and rationale, and a readable current artifact/authority proof.
- The exception helper must consume the exact current MET pair; plan-projection compatibility does not extend to exception authority. Every traversal role follows this support edge and checks current query/source, guardrails, freshness, scope, authority, and artifacts while waiving only that MET baseline.
- The descriptive cycle `MET -> exception DEC -> MET` terminates naturally at the visited worklist.
- Release candidate selection excludes only helper decisions referenced exclusively as baseline exceptions. If selected as a primary release candidate, full normal release predicates apply.

## 4. Affected Decisions and Change Boundaries

- A record hash mismatch, stale source, changed source origin revision, changed plan projection, or obsolete exact binding affects only candidate decisions whose bounded support traversal consumes that proof. Separate roots and independent proof branches remain evaluable.
- Issues for the same `(root DEC, code)` are coalesced deterministically; independent errors are preserved. `affected_decisions` does not imply that a release or product state was written or changed.
- Missing selected DEC/INV artifact files (`ENOENT`) are scoped `EVIDENCE_UNAVAILABLE` proof gaps. Permission, read, mutation, unsafe-path, and special-file faults remain global errors; do not collapse them into missing evidence.
- Dependency depth and supersession depth across all current and historical rows are capped at 64. Exceeding either bound emits global `LIMIT_EXCEEDED`, `valid:false`, and CLI exit 2; disconnected imported lineages are included.
- A structural error blocks action gates. Proof gaps block eligibility; warnings identify affected proofs without converting structural validity into an action approval.
- Expiry equality is stale (`asOf >= expires_at`). `source_truth_not_verified`, `human_authorization_not_authenticated`, and `historical_payloads_not_authenticated` are permanent limitations of the validator.

