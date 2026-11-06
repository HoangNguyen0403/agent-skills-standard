# Worker Receipt: Task 3 — N+1 Canonical Guidance and Held-Out Cases

- **Task ID**: `design-improvements-3`
- **Task Number**: 3
- **Owner**: Personal - Cheap worker 3
- **Project Domain**: Personal agent-skills-standard `prj_24334e6778b1395c`
- **Workspace Root**: `/Users/nguyenhuyhoang/.paseo/worktrees/0vty4mn4/zealous-flamingo`
- **Plan SHA-256**: `7460a2ffd4f1179fe90191ad465b880adc7a9319219474aa79fe03417142737b`
- **Status**: `completed`

---

## 1. Owned Paths Modified

1. `skills/database/database-query-performance/SKILL.md` (updated canonical rules, verify, anti-patterns, references; 52 lines ≤ 100 limit)
2. `skills/database/database-query-performance/references/nplus1-diagnosis.md` (new canonical diagnosis & remedy reference doc; corrected bounded batch description and relative link)
3. `skills/database/database-query-performance/evals/evals.json` (added N+1 diagnosis/remedy and spare-instance negative control evals)
4. `skills/system-design/system-design-data-architecture/SKILL.md` (updated scaling order, anti-patterns, verify, references; 91 lines ≤ 100 limit)
5. `skills/system-design/system-design-data-architecture/references/database-scaling.md` (added Query Amplification and Access Patterns section; canonical link: `../../../database/database-query-performance/references/nplus1-diagnosis.md`)
6. `skills/system-design/system-design-data-architecture/evals/evals.json` (added eval 16 for access-pattern amplification diagnosis and bounded DataLoader batching)
7. `skills/system-design/system-design-review/SKILL.md` (updated Data scaling axis, common mistakes, anti-patterns, references; 94 lines ≤ 100 limit)
8. `skills/system-design/system-design-review/references/mistakes-table.md` (added mistakes rows 33–35; canonical link: `../../../database/database-query-performance/references/nplus1-diagnosis.md`)
9. `skills/system-design/system-design-review/references/semantic-evaluation.md` (added hard-failure rules for query amplification and negative controls)
10. `skills/system-design/system-design-review/evals/evals.json` (added eval 11 for query amplification review, with brittle literal `not_contains` removed in favor of semantic adjudication)
11. `benchmarks/evals/system-design-nplus1-skills.txt` (skill participating list for N+1 evaluation)
12. `benchmarks/evals/system-design-nplus1-heldout.json` (manual behavioral held-out benchmark suite with 8 cases and 6 calibration examples; explicit `manifest_type: "manual_behavioral_heldout"`)

No peer-owned paths (including database fixture scripts), untargeted skills, or external dependencies were touched.

---

## 2. Implementation Summary & Corrective Follow-Up

Implemented the canonical N+1 guidance, cross-links, and held-out behavioral evaluation cases per **SRS LLD-003**, **SRS-007**, **SRS-008**, and **PRD AC-07**, **AC-08**, incorporating independent review findings:

1. **Concrete Bounded Formula vs. Per-Entity Execution (Review Correction 1)**:
   - Replaced invalid asymptotic claims (e.g. asserting $O(\lceil N/B \rceil)$ is asymptotically distinct from $O(N)$ at fixed $B$) with concrete comparison between:
     - **Per-entity sequential queries**: scaling as $1 + N$ or $Q_{base} + R \cdot N$, issuing individual queries for each parent record.
     - **Declared bounded batch loading**: satisfying the concrete formula $Q_{bounded} = Q_{base} + R \cdot \lceil N / B \rceil$, executing in fixed chunks bounded by batch size $B$ (e.g., 20 queries for 1,000 items with $B=50$, or 2 queries for $N \le B$).
   - Corrected `benchmarks/evals/system-design-nplus1-heldout.json` (case `N1-01` and `N1-05`), `nplus1-diagnosis.md`, and evals accordingly.

2. **Removal of Brittle Literal Wording Bans (Review Correction 2)**:
   - In `skills/system-design/system-design-review/evals/evals.json` (eval 11), removed `not_contains: "universal fix"` which erroneously failed valid answers stating that a blanket JOIN is "not a universal fix".
   - Did not substitute another forbidden phrase; semantic adjudication in `semantic-evaluation.md` evaluates the soundness of remedies.

3. **Canonical Relative Link Fixes (Review Correction 3)**:
   - Corrected relative links from depth-4 reference files to canonical database reference:
     - `skills/system-design/system-design-data-architecture/references/database-scaling.md` → `../../../database/database-query-performance/references/nplus1-diagnosis.md`.
     - `skills/system-design/system-design-review/references/mistakes-table.md` → `../../../database/database-query-performance/references/nplus1-diagnosis.md`.

4. **Explicit Held-Out Limitation (Review Correction 4)**:
   - Added explicit top-level metadata to `benchmarks/evals/system-design-nplus1-heldout.json`:
     `manifest_type: "manual_behavioral_heldout"`
     `note: "Curated behavioral held-out cases and calibration examples for manual/reviewed evaluation under fixed model/tools; this is not a native runner execution manifest."`

5. **Canonical Diagnosis & Semantics-Preserving Remedies**:
   - Evidence tiers: code-only static inspection is `suspected`, architectural proposals are `design risk`, and telemetry/statement logs are `observed`.
   - Smallest justified loading strategies: aggregate pushdown (`GROUP BY`/subquery), bounded batch lookup ($Q_{base} + R \cdot \lceil N / B \rceil$) for 1:N relations with parent pagination, and request-scoped `DataLoader` batching (strictly prohibiting cross-tenant or cross-request shared caches).
   - Invariants preserved: tenant isolation predicates, parent pagination boundaries, empty relation handling (`[]`), and deterministic ordering.

---

## 3. Verification Gate and Expected Outcomes

Per packet authority rules:
- **Mid-flight tests/build/lint/formatters**: **FORBIDDEN** during worker edits.
- **Model spend / live evaluation execution**: **FORBIDDEN** without separate authorized profile/quota.
- **Verification Status**: `EVALUATION NOT RUN` (all assets created, structurally validated, and frozen for parent integration).

### Verification Checks Performed by Worker (Non-disruptive):
- Validated JSON structure of `system-design-nplus1-heldout.json`, `database-query-performance/evals/evals.json`, `system-design-data-architecture/evals/evals.json`, and `system-design-review/evals/evals.json` via JSON parser query.
- Verified line count limits across all modified skills:
  - `skills/database/database-query-performance/SKILL.md`: 52 lines (limit 100).
  - `skills/system-design/system-design-data-architecture/SKILL.md`: 91 lines (limit 100).
  - `skills/system-design/system-design-review/SKILL.md`: 94 lines (limit 100).
- Verified markdown link targets: `skills/database/database-query-performance/references/nplus1-diagnosis.md` exists and resolves from all referencing relative paths.

### Expected Parent Verification Commands:
1. **JSON Syntax and Schema Verification**:
   ```bash
   python3 -c "import json; [json.load(open(f)) for f in ['benchmarks/evals/system-design-nplus1-heldout.json', 'skills/database/database-query-performance/evals/evals.json', 'skills/system-design/system-design-data-architecture/evals/evals.json', 'skills/system-design/system-design-review/evals/evals.json']]; print('ALL JSON VALID')"
   ```
2. **Skill Line Count Compliance**:
   ```bash
   wc -l skills/database/database-query-performance/SKILL.md skills/system-design/system-design-data-architecture/SKILL.md skills/system-design/system-design-review/SKILL.md
   ```
3. **Downstream Benchmark Ingress**:
   - Parent evaluates candidate skills against `benchmarks/evals/system-design-nplus1-heldout.json` when live evaluation runtime is authorized.

---

## 4. Risks and Boundaries

- **Manual Behavioral Held-Out Suite**: `system-design-nplus1-heldout.json` contains curated behavioral scenarios and calibration examples for independent reviewed assessment; it is not a native automated execution manifest.
- **Guidance vs. Runtime Boundary**: Worker 3 owns canonical rules, cross-links, and evaluation cases. The isolated SQLite fixture is owned by Worker 4 (`nplus1_smoke.py`).
- **Semantic Scorer Boundary**: Transcript regex/contains checks are lexical smoke signals; semantic evaluation requires checking invariants, pagination preservation, and tenant isolation as documented in `semantic-evaluation.md`.
- **Frozen State**: Owned write set is complete, corrected, and frozen for parent integration.
