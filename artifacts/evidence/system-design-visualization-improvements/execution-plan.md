# Approved execution packet: visualization and N+1

Authority: requesting maintainer explicitly said “approve corrections; subagent-driven; repair baseline” on 2026-11-05. Scope A+B1, approved PRD/SRS/ADR and review corrections; Personal domain authorized. Base revision 52671cf9ed6a1c376dfaaae7e621dbc51a4c8765. Intentional existing dirt consists of planning/design/evidence artifacts, not renderer source changes. Preserve unrelated changes.

Placement: independent disjoint implementation owners plus separate verification/review. Workers never delegate/commit/install/publish. No mid-flight build/lint/tests/formatters; freeze once edits complete, then parent runs focused checks and real smoke sequentially. New-test original RED is NOT RUN under that execution constraint; pre-existing seven golden failures are observed failing-before evidence only. Do not invent TDD history.

Shared interface fixed by integrator: add keyword-only `theme=None` to `render_drawio.render(spec, *, theme=None)`; omitted resolves `theme.mode` or light, explicit light/dark overrides presentation only. Preserve existing layout(spec), validate(spec), write_output API and exporter. Portable wrapper can render a deep-copied spec with theme.mode injected if needed, without rewriting original source bytes; no second renderer. Workers must forward cross-component gaps to parent, never edit another owner's files.

## Task 1 — Renderer themes geometry and focused baseline repair

**Scope / owned write set:** diagramming scripts render_drawio.py, style_catalog.py, check_layout.py, render_erd.py, validate_spec.py; existing corresponding Python tests; assets/fixtures root .drawio goldens only; references/diagram-spec.md and layout-rules.md.
**Inputs:** approved SRS LLD-001/SRS-001…003, PRD AC-01…03, existing baseline failure evidence and static delimiter diagnosis.
**Outputs:** complete compatible theme/geometry behavior and reviewed intended-serialization baseline repair; receipt of changes and limits.
**Real ingress:** existing renderer/validator CLI and render(spec) callers.
**Invariants:** preserve semantics/provenance/manual-edit and all eight types; deterministic per-render palette, no global mutation.
**Positive:** long/multiline labels reserve full geometry, both themes cover all paths; source intended semicolon tokens are valid.
**Negative:** no blind golden update, suppressed layout findings, invented components, raw spec markup or changed edge semantics.
**Verification owner:** parent integrator and independent Personal review profile; covering Python modules plus actual light/dark exports after freeze.
**Handoff / freeze:** report exact paths and freeze before shared commands; no mid-flight tests/build/lint/formatter.
**Correction route:** one focused correction with exact failed AC; quota exhaustion advances eligible configured route, no premium.

## Task 2 — Portable static export and honest delivery guidance

**Scope / owned write set:** new diagramming scripts/export_html.py and test_export_html.py; existing export_drawio.py only if strictly required; diagramming SKILL.md and references/mermaid-fallback.md; new references/offline-export.md if needed for concise skill routing.
**Inputs:** approved SRS LLD-002/FLOW-001/SRS-004…005 and reviewed security corrections; fixed shared renderer interface above.
**Outputs:** full strict static package CLI, no-clobber private publication, manifest capture binding, no active content, guidance consistent with implementation.
**Real ingress:** export_html.py SPEC --output-dir DIR [--manifest MANIFEST] using existing renderer/validator/exporter.
**Invariants:** exact source bytes/digest, private staging, trusted ancestors, exclusive no-follow children, PNG-only escaped page, staging-only cleanup.
**Positive:** both themes derive from one source; offline view title/scope/legend/evidence and digest; explicit manifest binds selected captured bytes.
**Negative:** reject existing paths/symlinks, unrelated/changed manifests and review_needed; never delete final published files after failure or claim CSP governs Desktop.
**Verification owner:** parent plus independent security reviewer; future actual browser and failure smoke after freeze.
**Handoff / freeze:** freeze owned files, return exact CLI/options and test command; no mid-flight checks.
**Correction route:** forward renderer/schema needs to parent; one corrective round for defects, configured quota fallback only.

## Task 3 — N+1 canonical guidance and held-out cases

**Scope / owned write set:** skills/database/database-query-performance/SKILL.md and references; system-design-data-architecture and system-design-review SKILL.md/references/evals; database-query-performance/evals/evals.json; new benchmarks/evals/system-design-nplus1-heldout.json and system-design-nplus1-skills.txt only.
**Inputs:** SRS LLD-003/SRS-007…008, PRD AC-07…08, existing ORM/communication guidance; no implementation editing to ORM catalog.
**Outputs:** concise canonical detection/remedy/evidence rules and reusable behavioral evaluation cases with negative controls.
**Real ingress:** system-design/review skill routing and normal source/design analysis, not a standalone duplicate skill.
**Invariants:** code-only suspected vs runtime observed; bounded loading preserves scope/results/page/cardinality; defer actual counts to trace evidence.
**Positive:** lazy loops/serializers/aggregates/GraphQL fan-out identified; remedies justified; already-batched and redundancy controls rejected.
**Negative:** no blanket giant JOIN, cache/index/concurrency-only fixes, duplicated framework recipes, keyword-only proof or live model run.
**Verification owner:** parent and independent reviewer; source case/schema checks and deterministic demonstrations after freeze, live efficacy explicitly NOT RUN.
**Handoff / freeze:** freeze and report exact edits, semantic expectations and limitations; no build/lint/tests/formatting or eval spend.
**Correction route:** parent integrates shared contracts; one focused quality correction then eligible fallback if needed.

## Task 4 — Real scoped N+1 fixture

**Scope / owned write set:** new skills/database/database-query-performance/scripts/nplus1_smoke.py and test_nplus1_smoke.py; no other database skill files.
**Inputs:** SRS LLD-004/SRS-009, PRD AC-09 and historical design query probe as feasibility only.
**Outputs:** runnable stdlib SQLite fixture with independent deterministic oracle, scoped parents/children, query counts/fingerprints/results/rows/bytes/timing and negative controls.
**Real ingress:** direct nplus1_smoke.py CLI exercising actual sqlite3 read entrypoint, not mocks/source assertions.
**Invariants:** in-memory synthetic data only, scoped parameterized queries, parent pagination and empty/varied children, bounded page/batch.
**Positive:** N=1/10/50 counts baseline 1+N vs candidate two for nonempty one-page relation, empty one; independent expected results and continuation/scope/aggregate controls.
**Negative:** baseline output is not sole oracle; no cross-scope cache, fabricated wire bytes, service startup, ORM/Postgres speed claims or silent partial success.
**Verification owner:** parent and independent review; actual CLI, focused unit and altered-query counterexample after freeze.
**Handoff / freeze:** return exact entrypoints/tests and freeze; do not run checks mid-flight or add duplicate prose.
**Correction route:** one focused AC correction; report actual prerequisite gap, no substitute fake execution.

## Task 5 — Bounded trace-ID compatibility

**Scope / owned write set:** scripts/outcome/schema.ts and schema.test.ts only; no unrelated enums/record fields/workflow files.
**Inputs:** SRS LLD-005/SRS-010 and existing rejection evidence; approved ID source preserved.
**Outputs:** generic optional single uppercase-alphanumeric namespace for BRD/REQ with >=3 digits; AC >=2 digits; existing numeric forms and SRS grammar retained.
**Real ingress:** validateRunRecord and exact required-scope outcome audit, existing callers.
**Invariants:** retain placeholder rejection, cost/workflow/scope checks and exact source IDs; no new alias/ID registry.
**Positive:** existing 20 IDs and legacy numeric forms accepted; focused malformed corpus rejected.
**Negative:** no slug special-case, silent normalization, empty trace arrays, weakened unrelated tests or install to hide missing tsx.
**Verification owner:** parent and independent reviewer; native tests only if dependencies available, otherwise honest source-derived checks and named blocked native lane.
**Handoff / freeze:** use code-intelligence references before exported contract edits when available; freeze source and report tests not run; no mid-flight checks.
**Correction route:** missing deps are prerequisite, not quota; no install without authorization; one bounded defect correction.
