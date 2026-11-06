# Feature Plan: Evidence-preserving visualization and N+1-aware design skills

Status: approved plan. Owner: requesting maintainer. Updated: 2026-11-05.

- Slug: `system-design-visualization-improvements`
- operator_profile: technical; lane: direction; snc_tier: medium; delivery_mode: standard
- SNC: S=2 N=1 C=1 total=4. Planning and repository tooling/standards only; no production data, credentials, authorization changes or runtime SQL mutation.
- Scope and delivery-plan approval: `approved(requesting-maintainer, 2026-11-05)` for visualization A and N+1 B1, including AC-01…09 and the six-slice delivery decomposition. The requesting maintainer accepted this plan via “ok” after its presentation. This does not approve an implementation approach, spend, publication or deployment.
- Authoritative source: [approved Direction brief](../brd/brd-system-design-visualization-improvements.md#approval), source revision SHA-256 `ea1270a08b12b91b3d8b81f64b585053d524f53565882ef4bd7e0f203839c4c1` before canonical-definition relocation. Approval evidence is the requesting maintainer's “ok” and explicit amendment approval in this conversation.

## Decision Brief

- **Changes since approved revision:** No scope added or removed. Promote the nine existing requirement/AC pairs into the canonical tables below; add implementation ownership, dependencies, estimates, verification lanes and owned technical decisions. The BRD retains direction, rationale, approval history and links rather than a competing editable AC set.
- **Recommendation:** Keep the JSON → draw.io pipeline. Deliver separate visualization and N+1 slices, with one implementation owner per shared component and one integrator. Preserve semantic checks; improve actual viewing quality. Reuse existing database/framework rules rather than introduce another N+1 skill.
- **Impact if wrong:** A second renderer could drift from semantics; unconditional JOIN advice could worsen memory, row multiplication or pagination; self-contained HTML could introduce unintended requests/execution; visually successful output could conceal unverified evidence.
- **Evidence and limitations:** Source inventories and one upstream hero-image inspection establish mechanisms and documented gaps, not implementation efficacy. Local `export_drawio.resolve_binary()` resolved `/Applications/draw.io.app/Contents/MacOS/draw.io`; an actual image export has not been exercised. Existing SQL/ORM eval definitions are answer prompts/assertions, not a runnable N+1 regression demonstration.
- **Unresolved decisions:** D-VIS, D-N1 and D-TRACE below have bounded owners and affected slices. D-TRACE must not cause silent ID renumbering or empty trace arrays.
- **Approval recorded:** The requesting maintainer accepted this decomposition/priority/ownership plan via “ok” on 2026-11-05. Engineering decisions go through `design-solution`; existing scope approval remains intact. No rollout/spending/exposure authority was requested or granted.
- **Independently ready for technical design:** S1 guidance reconciliation, S2 visualization, and S4 N+1 guidance/eval scenarios. S3 depends on the selected export contract; S5 on the selected N+1 example. No implementation execution mode has been selected.

## Outcome And Guardrails

BRD-OBJ-VIS-001 owns architecture comprehension; BRD-OBJ-PERF-001 owns N+1 recognition and bounded-remedy reasoning. Their accepted targets are represented in the relevant canonical AC rows, not a separate verification matrix.

The requesting maintainer is the Product/validation owner. Engineering owner is the registry maintainer role; verification owner is a separate reviewer/QA role. These are accountable role assignments for planning, not a claim that named workers have been dispatched.

Guardrails: JSON remains semantic authority; draw.io remains editable generated presentation; HTML/images are derived copies. Preserve IDs, relationship meaning, C4 level, provenance/confidence, metric provenance, manual-edit protection and manifest integrity. No hidden external requests, gallery publication, uncontrolled logo downloads or execution of untrusted HTML/SVG. Existing neutral icon and flat/split-view options remain valid. No cache-first or concurrency-only N+1 “fix.” A citation, screenshot or passing word-match evaluator is not runtime proof.

## Scope And Non-Goals

### Capability inventory

Each leaf has one containment parent; mappings refer to the canonical tables below.

- **Communicate an evidence-qualified design**
  - Preserve semantic identity and evidence — in_scope, REQ-VIS-001.
  - Lay out readable critical paths — in_scope, REQ-VIS-002.
  - Render coordinated themes — in_scope, REQ-VIS-003.
  - Open a portable local view — in_scope, REQ-VIS-004.
  - Report distinct delivery checks truthfully — in_scope, REQ-VIS-005.
  - Measure reader comprehension — in_scope, REQ-VIS-006.
- **Detect and address query amplification**
  - Recognize repeated per-item access and classify evidence — in_scope, REQ-PERF-001.
  - Select a bounded, semantics-preserving loading strategy — in_scope, REQ-PERF-002.
  - Demonstrate bounded work and equivalent results — in_scope, REQ-PERF-003.
- **Expand related capabilities**
  - Teach broader CPU/serialization/pool performance diagnosis — deferred to the approved BRD's B2 candidate; not a prerequisite for B1.
  - Add arbitrary vendor logos or true nested boundaries — deferred to BRD slice C; only revisit on evidence of need.
  - Replace the renderer, build an editor/gallery/React generator, mutate application SQL/frameworks, publish externally or benchmark the screenshot's server claim — excluded.

The scope fence is A + B1 only. No business-user permission model, market variants, UI feature toggles or new application schema/API is introduced. Later HTML and tooling interfaces are technical-design decisions, not new product behavior.

## Requirements And Acceptance Criteria

These tables are the active definitions. Existing IDs are retained, including the legacy AC width and VIS/PERF qualifiers. “Approved scope / planned” means accepted in the brief and not yet implemented, verified or accepted as delivered. Owner abbreviations: **ENG** = registry maintainer; **QA** = independent reviewer; **PO** = requesting maintainer. PO is accountable for priority/scope and eventual acceptance across all rows.

| Req ID | Requirement | Owner | Priority | Status | BRD objective |
| --- | --- | --- | --- | --- | --- |
| REQ-VIS-001 | Retain the existing semantic, evidence and editability contract through visual changes. | ENG | P0 | Approved scope / planned | BRD-OBJ-VIS-001 |
| REQ-VIS-002 | Make critical paths readable under difficult label, fan-out and boundary geometry. | ENG | P1 | Approved scope / planned | BRD-OBJ-VIS-001 |
| REQ-VIS-003 | Provide coordinated light/dark presentations of one semantic specification. | ENG | P1 | Approved scope / planned | BRD-OBJ-VIS-001 |
| REQ-VIS-004 | Provide a derived local viewing artifact that works without network access. | ENG | P1 | Approved scope / planned | BRD-OBJ-VIS-001 |
| REQ-VIS-005 | Make delivery guidance and receipts distinguish each executed or missing check. | ENG | P0 | Approved scope / planned | BRD-OBJ-VIS-001 |
| REQ-VIS-006 | Establish that the candidate improves architecture-reading usefulness without weakening semantics. | PO | P1 | Approved scope / planned | BRD-OBJ-VIS-001 |
| REQ-PERF-001 | Make design/review notice N+1 patterns and distinguish suspicion, design risk and observed amplification. | ENG | P1 | Approved scope / planned | BRD-OBJ-PERF-001 |
| REQ-PERF-002 | Recommend a suitable bounded loading strategy rather than a universal query rewrite. | ENG | P1 | Approved scope / planned | BRD-OBJ-PERF-001 |
| REQ-PERF-003 | Verify bounded data access and equivalent consumer results with runtime and held-out reasoning evidence. | ENG | P1 | Approved scope / planned | BRD-OBJ-PERF-001 |

An AC's verification lane names its single acceptance owner/method; that lane can consume several observations without duplicating the AC. Checks proposed here remain NOT RUN until exercised against an implementation revision.

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | REQ-VIS-001 | Existing fixtures for all eight diagram types, including manifest/provenance cases | Regenerate and export after presentation changes | Existing specs remain valid and identities, edge directions/labels/meaning, evidence/confidence, metric provenance, group membership and manifest links remain unchanged; proposed/documented state never becomes observed by styling. Manual-edit protection remains effective. | QA | Integration: semantic regeneration and export comparison |
| AC-02 | REQ-VIS-002 | Long/wrapped labels, hub fan-out, cross-row edges and group-boundary cases at their intended reading size | Inspect actual candidate exports | Relevant text/arrowheads remain legible and lines avoid unrelated labels/nodes; unresolved geometry produces a finding and spec revision or view split, never a hidden crossing or strict-pass waiver. | QA | Manual: image readability review |
| AC-03 | REQ-VIS-003 | One semantic graph with long labels, unavailable/monochrome icons and visible uncertainty | Render and inspect both themes | Theme variants preserve meaning/evidence and WCAG AA text contrast; text identifies components when an icon is unavailable. No separately authored semantic graph is required. | QA | Manual: dual-theme contrast and meaning review |
| AC-04 | REQ-VIS-004 | A verified diagram export and its semantic metadata; networking disabled in a local browser | Open the delivered local HTML package | Diagram, title, scope, legend, revision and evidence status display without external requests or untrusted executable content; source/draw.io remain editable separately. Missing exporter is a recorded blocker/NOT RUN, not successful portable acceptance. | QA | Consumer smoke: offline local-browser inspection |
| AC-05 | REQ-VIS-005 | Successful, failed and unavailable export/inspection scenarios | Consume the revised diagram workflow/reference instructions and resulting receipts | Spec validation, strict layout, export, actual visual inspection and semantic consistency are separately truthful; no machine check implies visual proof. Source-of-truth/manual-edit guidance and missing-exporter status agree with actual implementation. | QA | Behavioral evaluation: workflow delivery scenarios |
| AC-06 | REQ-VIS-006 | Identical baseline/candidate questions on simple stack, dev tooling, long-label hub, nested-deployment needs, stateful dataflow and SDK/IPC scenarios | A maintainer identifies main path, boundary, authoritative state or justified absence, and uncertainty without coaching | Record correctness, interpretation time, corrections, configuration and non-applicable questions; within 30 days after implementation begins achieve at least 90% correct applicable answers and at least 20% lower median interpretation time, with no semantic/evidence regression. Fix questions/scoring first; flat boundaries/split views may satisfy deployment needs. Targets are accepted hypotheses, not measured benefits or a promised delivery date. | PO | Manual: paired reader acceptance exercise |
| AC-07 | REQ-PERF-001 | ORM loops, hidden serializer/template lazy loads, per-record aggregates, GraphQL fan-out and already-batched/spare-instance controls | Applicable design/review skills analyze held-out examples under fixed model/tools | Identify entrypoint, repeated access, cardinality and expected growth; source-only findings remain suspected, design-only concerns remain risks with verification plans, runtime claims require instrumented evidence. Reuse canonical guidance and reject false positives. | QA | Behavioral evaluation: N+1 recognition cases |
| AC-08 | REQ-PERF-002 | A recognized risk plus explicit cardinality, response, pagination and scope constraints, or missing evidence | Applicable skills recommend a remedy | Select/explain the smallest suitable projection/aggregate, bounded eager loading, JOIN, batched key lookup or request-scoped DataLoader; preserve filters, tenant/authorization scope, ordering, consistency, empty relations and memory bounds. Reject giant-JOIN/cache/index/parallel-per-row universal advice; identify specific missing evidence instead of claiming a fix. | QA | Behavioral evaluation: constrained remedy cases |
| AC-09 | REQ-PERF-003 | A real representative query entrypoint with an intentional N+1 baseline, varied/empty children and already-batched/aggregate controls | Capture baseline/candidate results and emitted queries/calls at 1, 10 and 50 parents, then review held-out skill judgments | Preserve outputs and parent pagination while meeting the declared fixed-page or bounded-batch query bound, such as Q_base + R * ceil(N / B), not one relation query per parent. Capture fingerprints/counts, rows/bytes, latency/environment and negative-control outcomes. The intentionally faulty baseline must be rejected. Before B1 acceptance, all applicable AC-07…09 held-out cases must correctly distinguish amplification/controls; token matches and pictures are insufficient proof. | QA | Integration: instrumented N+1 acceptance with reviewed judgment evidence |

## Open Consequential Decisions

These do not reopen product scope. Each blocks only the affected technical implementation/acceptance, not completion of this requirements plan.

| Decision | Owner | Affected slice | Consequence if wrong | Required input / resolution path |
| --- | --- | --- | --- | --- |
| D-VIS: define backward-compatible theme/layout and derived HTML/export interfaces | ENG, reviewed independently | S2, S3 | Competing semantic authorities, unsafe/offline-incomplete HTML, unreliable text geometry | In design-solution, specify defaults/schema compatibility, label bounds, output packaging, escaping/content policy, theme/export metadata and error semantics; prove intended exporter operation before finalizing dependent acceptance. Favor a minimal derived wrapper rather than a second renderer. |
| D-N1: select one representative database/framework entrypoint and bounded fixture contract | ENG with QA | S5; live proof for B1 | Illustrative queries or mocked counts falsely appear to prove request-level remediation | In design-solution, inventory available local runtime/dependencies and choose a real query entrypoint, fixed datasets and count/latency measurement. Bound memory/rows and parent pagination; do not require every ORM adapter to gain a runtime fixture. No application data or production resources. |
| D-TRACE: reconcile approved trace IDs with strict machine-record patterns | Tooling maintainer with PO; no automatic migration | Machine-audited handoff | Silent renumbering, orphaned approvals or an empty/misleading trace | `scripts/outcome/schema.ts:105-109` accepts numeric-only BRD-OBJ/REQ/AC forms; approved IDs do not fit. Keep exact source IDs in this plan/run record and report the compatibility failure. A scoped validator change or explicitly approved trace migration requires a separate authorized technical decision. |
| D-EXEC: settle implementation execution approach and assignments | PO and integrator | All implementation work | Unapproved worker routing or orchestrator edits | Offer Subagent-Driven (recommended) versus a genuinely small permitted Inline exception at implementation entry. Do not treat repeated brief approvals as execution-mode or spend authorization. |

No primary benchmark source is required for these requirements: do not use the screenshot's numerical claims. Its absence remains an evidence limitation, not a dependency that blocks independent repository work.

## Flows And Decision Boundaries

### Author and review a diagram

Design author selects an audience/question → records evidence-qualified spec → renderer generates editable presentation → exporter produces a derived visual → reviewer inspects the actual surface → workflow reports each check distinctly → PO evaluates usefulness. An unavailable export stops export-dependent acceptance, not source-spec validation or unrelated N+1 work.

### Notice and address amplification

Design/review detects repeated collection-dependent access → classifies risk/suspicion/measurement → loads canonical diagnosis plus only the relevant framework guidance → proposes a bounded strategy → real entrypoint measures result equivalence and query growth → independent reviewer adjudicates the evidence. A flow view explains the proposal but does not replace query instrumentation.

| Evidence state | Permitted finding | Not permitted |
| --- | --- | --- |
| Only code/design suggests per-item access | Suspected N+1 or design risk, with named verification plan | Invented observed query count or latency gain |
| Instrumented collection-dependent access | Observed amplification tied to entrypoint, N and trace | Treating one EXPLAIN plan as request-wide execution count |
| Already-batched access or spare-instance redundancy | Reject the N+1-query finding; assess any distinct cost separately | Flagging every multiple-query request or every “N+1” string |
| Candidate reduces query count but changes pagination/results | Reject remediation acceptance | Declaring success because fewer statements executed |

## Implementation Plan And Task Slices

This section decomposes the approved product contract; unresolved technical choices remain D-VIS/D-N1. Estimates are relative t-shirt sizes, not durations, prices or commitments. Each slice's implementer owns all edits to its named shared component; the integrator sequences shared workflow/reference edits. Native scouts supplied read-only evidence only.

| Slice | Owner and component boundary | Requirement / AC refs | Expected artifact and verification reference | Dependencies | Size / confidence | Capability request |
| --- | --- | --- | --- | --- | --- | --- |
| S1 — Reconcile existing delivery guidance | Diagram-guidance implementer; `skills/common/common-architecture-diagramming/references/mermaid-fallback.md` and only directly related export guidance | REQ-VIS-001,005 / AC-01,05 | Consistent semantic-authority, hand-edit, visual-proof and exporter-status guidance; behavioral evidence via assigned AC lanes | Approved plan/execution mode; coordinate guidance changes with S2/S3 | S / high | S=0 N=1 C=1 total=2 low; fast, configured eligible implementation route |
| S2 — Improve readable layout and themes | One diagram-renderer implementer; existing renderer/checker/style/validator files and schema reference, plus existing geometry/provenance fixtures | REQ-VIS-001,002,003 / AC-01…03 | Spec-compatible rendering changes, difficult-layout cases and both-theme image evidence; no second semantic graph | D-VIS; shared semantic contract fixed before S3 integration | L / medium | S=1 N=1 C=1 total=3 medium; standard |
| S3 — Deliver portable derived viewing | Export implementer; existing export surface and a minimal local HTML artifact path chosen in D-VIS; no edits to S2-owned renderer files | REQ-VIS-001,004,005 / AC-01,04,05 | Derived viewing output and honest errors/receipts; offline browser evidence | D-VIS and accepted S2 output/metadata interface; can then work separately | M / medium | S=1 N=1 C=1 total=3 medium; standard; re-score if active-content/security scope expands |
| S4 — Integrate N+1 recognition/remedy guidance | One design/database-guidance implementer; `system-design-data-architecture`, `system-design-review`, `database-query-performance`; reuse communication/framework guidance rather than edit the entire ORM catalog | REQ-PERF-001,002 / AC-07,08 | Concise canonical cross-links and held-out behavior cases, with optional explanatory flow example only if useful | Approved plan/execution mode; independent of theme/export environment; references selected adapter in S5 when settled | M / high | S=2 N=1 C=1 total=4 medium; standard |
| S5 — Exercise bounded N+1 loading | N+1-runtime implementer; isolated example/measurement fixture chosen in D-N1 and its minimal verification surface; no application SQL or S4-owned skill edits | REQ-PERF-003 / AC-09, consuming AC-07,08 evidence | Real emitted-query baseline/candidate, result/pagination oracle and negative controls; no mocked SQL-count success | D-N1; coordinate example contract with S4; actual live model evaluations require separate authorized runtime/profile/quota | M / medium | S=1 N=1 C=1 total=3 medium; standard; re-score for any real data/trust-boundary scope |
| S6 — Integrate and independently accept | Integrator coordinates; tooling maintainer separately owns the bounded CMP-006 trace-compatibility subtask within S6, with independent QA verification; PO supplies human usefulness acceptance | All requirements / AC-01…09; approved D-TRACE / SRS-010 subtask | Revision-bound integrated evidence, bounded validator compatibility, held-out judgments, reader comparison, canonical docs/changelog and consumer-discovery/parity evidence when publication is authorized | S1…S5 for complete acceptance; CMP-006 additionally needs native dependencies and its own focused checks; no seventh unmanaged slice | M / medium | Independent review and bounded compatibility work routed separately by risk; no automatic premium |

### Scheduling and shared contracts

After required approvals and design decisions, S1 and S4 are independent; S2 may proceed once D-VIS is settled. S3 can proceed after its interface is fixed rather than wait for all S2 visual work. S5 is independent of visualization once D-N1 is settled. Batch genuine independent implementation slices; never assign two workers the renderer or the same SKILL.md. QA does not supply human approval. No worker may expand into vendor/nested/B2 work.

Actual provider/model/effort must come from discovered eligible host profiles at dispatch; capability requests above are not model/account authorization. Preserve configured settings and report actual usage or unavailable. Current lookup workers were native read-only scouts; their model/effort receipts were not exposed. No implementation profiles have been launched for this plan.

### Existing verification entrypoints

Commands here are documented future entrypoints, not claims they ran during planning:

- Diagram behavior, working directory `skills/common/common-architecture-diagramming/scripts`: `rtk proxy python3 -m unittest test_fixtures test_check_layout test_render_drawio test_view_manifest`. Keep `UPDATE_GOLDEN` unset and ensure expected goldens exist before running: the current fixture harness may create missing goldens. Golden equality alone does not prove the new ACs.
- Image export: `rtk proxy python3 skills/common/common-architecture-diagramming/scripts/export_drawio.py INPUT.drawio -f png -o OUTPUT.png`; substitute actual revision-bound generated artifacts after design. Binary discovery succeeded during planning; actual export and visual acceptance remain NOT RUN.
- Held-out skill evaluation: select exact skills/prompts, run `rtk pnpm evals:preflight -- --skills-file SELECTION`, prepare a manifest, and estimate before any execution. `docs/EVALS.md` owns execution/verification commands. An available Codex account is not spend/usage authorization, nor authorization to bypass host profile restrictions. If its executor cannot materialize the approved route, resolve that prerequisite rather than silently substitute a model. Transcript/keyword scores do not establish runtime SQL behavior or independent semantic quality.
- N+1 runtime: exact database, entrypoint and instrumented command are D-N1 outputs, not invented shell commands. Existing scoped ORM/database eval assets did not supply a runnable fixture; source examples are not a substitute.
- Machine handoff audit: `rtk pnpm audit:outcome -- --records --required --slug system-design-visualization-improvements --workflow plan-feature --run-id plan-system-design-visualization-improvements-20261105 --json`. The ID-format incompatibility is known; record its actual result separately from plan-quality checks.

No live evaluation, package installation, public publishing or quota consumption is authorized by this command list.

## RACI, Risks And Change Impact

| Responsibility | Accountable | Responsible | Consulted / independent check |
| --- | --- | --- | --- |
| Scope, priority, metric and plan acceptance | Requesting maintainer / PO | Planning lead | Registry maintainer, QA |
| Technical contracts and implementation integrity | Registry maintainer / ENG | Assigned single component implementer | Separate reviewer; PO for material trade-offs |
| Evidence, semantic/visual evaluation and SQL verification | Independent QA/reviewer | Assigned verifier | Component implementer explains evidence but cannot self-approve |
| Reader usefulness acceptance | Requesting maintainer / PO | Human participant and facilitator | QA records results |
| Publication/release decision | Requesting maintainer | Integrator only after explicit matching authorization | QA and registry maintainer |

| Risk | Mitigation / owner | Trace |
| --- | --- | --- |
| Presentation overwrites semantic truth or false visual certainty | Single source, existing manifest/baseline protection, distinct checks; ENG | AC-01,05 |
| HTML embeds unsafe content or hidden network dependencies | Minimal derived output and offline/content-policy proof; D-VIS owner | AC-04 |
| JOIN reduces count but increases cost or changes result shape | Cardinality/pagination/rows/bytes and result equivalence, bounded alternatives; D-N1 owner | AC-08,09 |
| Skill text grows without better decisions | Short canonical rules and references, fixed-model held-out cases; guidance owner | AC-07…09 |
| Incomplete hosted evaluation or exporter evidence is claimed PASS | Preserve NOT RUN and restrict acceptance; QA | AC-03…09 |
| Trace audit rejects approved IDs | Preserve source IDs and approvals, report exact failure; tooling maintainer | D-TRACE |

The N+1 amendment impacts only B1 requirements, their acceptance/evidence and shared planning dependencies. Other approved constraints are unchanged. Future scope/metric changes reopen affected approval/evidence only. No application schema migration, operational rollout or new production telemetry is included. Registry publication remains a separate approval: after authorized implementation and smoke evidence, update canonical docs/changelog and use existing generation/parity checks; do not edit installed copies independently.

## References And Evidence Receipt

- [Approved BRD and source evidence ledger](../brd/brd-system-design-visualization-improvements.md): carries upstream revision, local file citations, rejected options, assumptions, glossary and approval history; not a second editable requirement table.
- [Diagramming standard](../../skills/common/common-architecture-diagramming/SKILL.md), [spec](../../skills/common/common-architecture-diagramming/references/diagram-spec.md), [critical-flow contract](../../skills/system-design/system-design-data-architecture/references/flow-contracts.md).
- [Canonical N+1 diagnosis](../../skills/database/database-query-performance/SKILL.md), [communication selection](../../skills/system-design/system-design-communication/references/communication-selection.md), [review pitfalls](../../skills/system-design/system-design-review/references/mistakes-table.md).
- [Eval execution documentation](../EVALS.md), [run-record schema](../../scripts/outcome/schema.ts).
- No matching PRD/SRS/product evidence ledger existed in the scoped current-workspace inventory at planning time. Reuse the BRD evidence; do not duplicate unrelated marketing strategy/OPP/DEC/MET records or invent product IDs.
- Confirmed during planning: approved source hash above; source-backed verification commands; actual local exporter discovery. Not exercised: image generation, offline behavior, SQL fixture, held-out model evaluations or reader-value comparison.

## Status And Handoff

- `feature_status: requirements_ready`: requirements plan prepared; technical design, plan approval and implementation readiness are distinct.
- `approval: approved(requesting-maintainer, 2026-11-05)` for this delivery plan, in addition to the previously approved source scope and N+1 amendment.
- Run record: [plan-system-design-visualization-improvements-20261105.json](../../artifacts/runs/system-design-visualization-improvements/plan-system-design-visualization-improvements-20261105.json). It preserves approved IDs; D-TRACE records the expected strict schema incompatibility. Never interpret parseable JSON or a schema pass as approval.
- Planning checks: **PASS** for nine unique requirement/AC mappings, six slices, all 11 local markdown links and BRD canonical-definition delegation. **NOT RUN** for the full native run-record audit: its invocation stopped at `tsx: command not found` with missing node_modules. A separate dependency-free probe evaluated the exact trace-ID regexes from the canonical schema: **FAIL**, all 20 approved objective/requirement/AC IDs are incompatible. This is a narrow format check, not a full schema execution. Owners: tooling maintainer resolves D-TRACE and the local dependency prerequisite; no packages were installed or IDs changed.
- Downstream [technical SRS](../srs/srs-system-design-visualization-improvements.md), [ADR](../adr/adr-system-design-visualization-improvements.md) and [walkthrough](../srs/srs-walkthrough-system-design-visualization-improvements.md) define the approved technical baseline. Human technical-design approval and Personal review-domain authorization are recorded. Detailed risk remains high/extended. Independent review requested narrow publication/manifest/network-proof corrections, now integrated pending confirmation; original product scope and delivery-plan approval are unchanged.
- Exact combined model/tool cost is unavailable. MCP consultation telemetry is not implementation/evaluation proof.

## Next Workflow

Review the proposed SRS/ADR from `design-solution`, then use `implementation-readiness` after the independent and human design gates. Live skill evaluation and reader acceptance retain their own authority/evidence gates; no implementation, spend or external exposure follows automatically from this planning artifact.
