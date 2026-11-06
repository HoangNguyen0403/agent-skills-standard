# Technical Design: Evidence-preserving visualization and N+1-aware design skills

Status: corrected technical design approved; Subagent-Driven implementation and focused baseline repair authorized. Owner: registry maintainer; scope/validation owner: requesting maintainer. Date: 2026-11-05.

slug: system-design-visualization-improvements; operator_profile: technical; lane: direction; snc_tier: high; delivery_mode: extended.

## Decision Brief

- **Changes since approved revision:** Product scope and AC-01…09 remain unchanged. Resolve D-VIS with a per-render theme and safe static-PNG viewing package; resolve D-N1 with a real SQLite repository/query fixture; propose a generic bounded trace-ID validator extension for D-TRACE. No implementation or publication is included in this design task.
- **Risk reassessment:** SNC S=2 N=1 C=2 total=5, high. Earlier planning used medium/standard; detailed design exposes a spec-text → HTML-label/static-view trust boundary. The sensitive-change floor requires extended design, explicit human design approval, independent semantic/architecture review and independent security review before implementation. A capability hint does not authorize premium or a different account.
- **Recommendation:** Preserve one semantic graph and renderer; extend existing contracts, package only generated PNGs and escaped metadata, and use instrumented result-equivalence proof for N+1 rather than universal JOIN advice.
- **Impact if wrong:** Evidence/edge meaning can drift, markup may become executable, visual checks may overclaim, SQL-count improvements may change pagination/results, or trace adaptation may weaken unrelated validation.
- **Evidence:** Existing Desktop export actually ran and the baseline PNG was inspected; a separate in-memory SQLite experiment actually measured statement counts and equal synthetic results. Neither proves the proposed new exporter, themes, runtime fixture or skill efficacy. See the [walkthrough](srs-walkthrough-system-design-visualization-improvements.md).
- **Approval recorded:** On 2026-11-05 the requesting maintainer selected “Approve technical design” for this SRS and its ADR, including bounded shared-validator compatibility, and authorized the Personal review domain. Approved pre-status-update revisions: SRS SHA-256 `1309563d70d611f5b5f6a7100803c2f431c7cad3c051fe0b29f3bdf3d822fd7a`; ADR SHA-256 `862316f011fe46a4b2046bbd398f42f808ababf4800e56a4f2a35ce9b803f50c`. Independent review is not human implementation/spend/publication approval.
- **Execution approval:** The maintainer explicitly replied “approve corrections; subagent-driven; repair baseline.” This approves the independently reviewed correction delta, bounded workers and focused intended-serialization baseline repair. It does not authorize installs, live model evaluations, publication, deployment, premium calls or unrelated changes.
- **Subsequent compatibility approval:** After the real required document-trace audit exposed its separate numeric-only grammar, the maintainer explicitly selected “Align trace parser too.” Extend the same approved formal grammar to bounded `scripts/trace` parsing/graph tests, preserving historical source-group mappings and exact required-scope failures. This is additional explicit authority, not inferred from the original outcome-validator-only target.
- **Decisions resolved in design:** D-VIS, D-N1 and the proposed D-TRACE mechanism below. Their implementation and validation are not claimed. D-EXEC remains an implementation-entry gate.
- **Independent progress:** Guidance S1/S4 and fixture S5 do not depend on image-export success; S2/S3 share the fixed renderer/package interface below. All source edits still require the matching execution/review gates.

## Trace Source

- Original request: improve existing system-design/visualization skills using stack-diagram; subsequent explicit N+1 amendment. Scope owner: requesting maintainer.
- [Approved BRD](../brd/brd-system-design-visualization-improvements.md#approval); original accepted revision before canonical relocation: SHA-256 `ea1270a08b12b91b3d8b81f64b585053d524f53565882ef4bd7e0f203839c4c1`.
- [Approved PRD and six delivery slices](../prd/prd-system-design-visualization-improvements.md); approved revision before any downstream design-link update: SHA-256 `f1ed4fe790932e6500b5b29c4fca01c5cd06d3be292c8ee03322af81ca5d435f`.
- Prior scoped approvals: maintainer “ok” accepted visualization; explicit N+1 amendment approval accepted B1; subsequent “ok” accepted the six-slice delivery plan. These do not approve this new technical design.
- BRD objectives: BRD-OBJ-VIS-001 and BRD-OBJ-PERF-001. Source requirements: REQ-VIS-001…006 and REQ-PERF-001…003. Canonical behavioral definitions and acceptance owners remain solely in the PRD AC-01…09 table.
- A is visualization; B1 is required N+1 detection/remediation/verification. B2, arbitrary vendor assets, true nested groups, a second renderer, application-query mutations and public sharing remain outside this design.

## HLD-001 — Architecture And Contract Delta

Audience: registry/tool maintainers and independent reviewers. Question: how do the approved visual and N+1 improvements preserve semantic authority and produce honest evidence? Lifecycle: proposed; evidence kind: document. Tables and logical flows answer this contract question; no new architecture diagram is required to approve these interfaces.

| Component | Owner / boundary | Delta and dependency direction | Failure domain |
| --- | --- | --- | --- |
| CMP-001 — Semantic spec and validation | Diagram-renderer implementer, PRD S2 | Existing spec/manifest authority; optional theme mode and literal text handling. Validator and manifest checks precede publication of derived output. | Invalid spec/provenance remains a source error, not a visual fallback |
| CMP-002 — Layout and draw.io presentation | Same S2 implementer; one owner for shared renderer/checker/style/ERD/sequence changes | Reuse `layout`, `render`, route planner and manual-edit baseline gates. Geometry derives from spec and complete planned text bounds; theme affects style, not semantic identities. | Layout finding remains visible; no forced successful export |
| CMP-003 — PNG export and static viewing | PRD S3 export implementer; imports only the accepted CMP-001/002 public entrypoints | Existing Desktop exporter remains image backend. New `export_html.py` orchestrates strict generation and produces a static local package, not a renderer/editor. | Missing Desktop, export failure, unsafe input or output conflict fails this derived-output operation only |
| CMP-004 — Canonical N+1 guidance | PRD S4 guidance implementer | `database-query-performance` owns diagnosis; design/data/review references it and applicable ORM/GraphQL guidance. Concise references, no recipe copying. | Missing evidence yields a risk/suspected finding with a verification plan |
| CMP-005 — Isolated query-shape fixture | PRD S5 fixture implementer; new database-query-performance script | Real Python sqlite3 entrypoint owns synthetic data, emitted-query instrumentation and baseline/candidate comparison. No app DB/ORM/service dependency. | Fixture failure blocks B1 runtime acceptance, not diagram generation |
| CMP-006 — Machine trace audit | Tooling maintainer owns the S6 compatibility subtask; integrator coordinates, independent QA verifies | Extend accepted ID grammar without renaming source IDs; preserve all other run-record checks and scope guarantees. No seventh unmanaged delivery slice is introduced. | Schema incompatibility remains a failed audit, never empty trace or forged approval |

Dependencies are synchronous local calls/files; no queue, distributed store, retry service, new external API or background process is justified. Original source/evidence remains authoritative; temp files, PNGs and the static page are derived snapshots. The HTML renderer never evaluates a diagram's source code, citation contents or markup.

## FLOW-001 — Generate A Local Viewing Package

Actor: design author. Trigger: invoke the proposed package CLI with a local spec and a new output directory. Inputs: JSON bytes and local paths. Source authority: exact spec bytes; optional explicit manifest constrains view identity. Sink: the completed static package consumed by a local browser.

Normal course: read/validate spec and bind any explicit manifest to its captured bytes → compute source SHA-256 → apply presentation overrides without rewriting source → strict-render two draw.io files in private staging → export PNGs → escape metadata and embed PNG data → exclusively reserve a private final directory under trusted local ancestors → create each child exclusively without following symlinks, publishing `index.html` last → report successful command completion. Existing standalone renderer/exporter paths remain available.

Invariant: neither source evidence nor pre-existing user output is mutated; a theme/image never promotes evidence confidence. Exit 0 confirms that this invocation completed its checks/publication sequence. The later existence of a directory or `index.html` alone does not authenticate completion, ownership, freshness or integrity. Conflicts are rejected, not retried/overwritten. Trusted local ancestors and private operation-owned directories are required; hostile same-UID ancestor/directory replacement is outside the protection claim.

Alternate/exception courses: invalid spec/manifest, changed or unrelated manifest capture, canonical review_needed, strict layout or image failure stops completion; unavailable Desktop reports a prerequisite gap; output/child conflicts preserve prior content. Once final publication begins, retain and report incomplete final output on failure: never automatically unlink final entries or recursively remove final content. Clean only operation-owned private staging. No upload, alternate renderer, placeholder image or implicit source repair is a fallback.

## FLOW-002 — Detect And Verify N+1

Actor: design/review author or fixture operator. Trigger: a collection-dependent data path. Inputs: source/design evidence or controlled synthetic fixture parameters. Authority: source determines design intent; actual query trace determines observed execution; independent expected results determine consumer equivalence.

Normal course: locate repeated access and N → classify evidence → select appropriate canonical/framework guidance → choose a bounded remedy → run controlled baseline/candidate → compare query growth, results/pagination, rows/bytes and latency → independent reviewer judges the result. Diagramming a `1 + N` flow is optional explanatory output, not the query-count oracle.

Invariant: lower statement count never excuses changed results, scope or pagination. A query plan describes one statement; it does not count request-level executions. Cache hits, concurrent per-row queries and pipelining cannot establish removal of collection-dependent work.

## Technical Requirements

Each SRS card owns one verification mapping. VER IDs below identify evidence obligations, not claims that tests/evals already passed. Planned evidence files live under a future revision-bound implementation run directory; the current walkthrough records only the design-time observations actually made.

### SRS-001: Preserve semantic and provenance contracts

- Statement / priority / status: CMP-001/002 shall preserve all existing diagram semantics and baseline protections through presentation changes; Must; approved design, implementation unverified.
- Source: REQ-VIS-001, AC-01; HLD-001 → CMP-001/002 → LLD-001.
- Behavior: Existing specs without theme mode retain light behavior; all eight type paths, node/edge properties, identities, confidence, lifecycle, metric provenance and optional manifest checks remain valid. Theme settings are presentation only. Do not drop ERD/sequence properties by testing ordinary edges alone.
- Failure/fallback: Invalid source or manual-edit conflict remains an error; never silently strip metadata, infer a protocol, acknowledge manual edits or change a source to make an export pass.
- NFR/security: Literal spec text must not become active markup. Source byte digest is reproducible; semantic comparison ignores only declared presentation changes, not evidence or labels.
- Verification: VER-001 — integration, existing eight-type/provenance/manifest/manual-edit cases plus cross-theme semantic projection; evidence `semantic-compatibility.json` in the implementation run.

### SRS-002: Plan complete text and route geometry

- Statement / priority / status: CMP-002 shall use the same complete planned geometry for rendering and strict checks; Must; approved design, implementation unverified.
- Source: REQ-VIS-002, AC-02; HLD-001 → CMP-002 → LLD-001.
- Behavior: Reserve multiline label/sublabel, confidence/lifecycle, metric and warning rectangles, plus group/title/legend text, before route placement. Deterministic wrapping respects configured text widths without truncating meaning. Route ports and candidate row/gap corridors avoid expanded full footprints; preserve spec order for deterministic tie-breaking. Sequence/ERD use their own semantics but the same text-bound principle.
- Failure/fallback: When no collision-free candidate exists, emit an actionable strict finding and require spec spacing/order/view splitting. No masking crossing with opaque labels, automatic component invention or universal router promise. The conservative text estimator is not browser font measurement.
- NFR/security: No ellipsis/truncation may conceal evidence status or relationship meaning. Strict geometry is necessary, not sufficient for visual acceptance.
- Verification: VER-002 — manual visual review of actual long-label/hub/cross-row/boundary exports at intended reading size, with accompanying geometry findings; evidence `layout-visual-review.md` and images.

### SRS-003: Render coordinated themes

- Statement / priority / status: CMP-002 shall render light and dark presentations through a per-render palette; Must; approved design, implementation unverified.
- Source: REQ-VIS-003, AC-03; HLD-001 → CMP-002 → LLD-001.
- Behavior: Cover model/page background, text, groups, lifelines, legend, warnings, edge labels, arrowheads, normal and special-type styles. Preserve existing verified AWS/GCP icon identity; use text/generic fallback where required by current policy. A specified decorative accent does not override accessible text/warning colors. Do not mutate shared STYLE_CATALOG across renders or create separate semantic specs.
- Failure/fallback: Unknown mode or invalid existing accent fails validation. Dark generation is not “passed” if only a light PNG exists. Never recolor brand artwork to fit the palette.
- NFR/security: WCAG AA text contrast and evidence readability in both themes remain the accepted product target; actual exports and contrast calculations are required, not theme-name assertions.
- Verification: VER-003 — manual dual-theme contrast/meaning inspection with measured text/background contrast and image evidence; evidence `theme-review.md`.

### SRS-004: Produce a safe offline package

- Statement / priority / status: CMP-003 shall produce the static derived package specified in LLD-002; Must; approved design, implementation unverified.
- Source: REQ-VIS-004, AC-04; HLD-001 → CMP-003 → LLD-002.
- Behavior: Generate from one validated spec, render both themes through existing entrypoints, embed only verified PNG bytes and escaped metadata, and publish into an exclusively new directory. Copy exact source bytes as a snapshot, not rewritten theme graphs. The page exposes title, scope, version/date, source digest, legend and evidence status; image alt text is escaped.
- Failure/fallback: Never clobber a path or insert raw spec HTML/SVG, JavaScript, remote font/logo/resource URLs, citation file contents or external links. No complete `index.html` is published after any failed check/export. Report which step failed and retain existing producer exit semantics as diagnostic detail.
- NFR/security: Correct escaping, PNG-only content and CSP must prevent script execution and external egress. Offline-open proves functionality only; separate attempted-request/CSP observations are required. Generated spec-origin text is escaped before renderer label assembly; the page contains no absolute workstation paths or environment identity.
- Verification: VER-004 — consumer smoke: (a) local offline-open, (b) separate recorded attempted-request/CSP checks using interception or a controlled sink with external egress prevented, and (c) observed Desktop-export behavior separately from browser consumption. Include injection/network-attempt fixtures and independent security review; evidence `offline-package-review.md`, requests/violations/console observations.

### SRS-005: Make delivery instructions and results honest

- Statement / priority / status: CMP-003 and consuming guidance shall report executed and missing gates independently; Must; approved design, implementation unverified.
- Source: REQ-VIS-005, AC-05; HLD-001 → CMP-003/004 → LLD-002/003.
- Behavior: Reconcile mermaid-fallback.md with JSON authority, baseline/manual-edit rules, actual exporter exit statuses and mandatory visual inspection. Retain PASS/FAIL/NOT RUN/NOT APPLICABLE distinctions in existing walkthrough/run evidence. A generated file or Desktop zero exit is not a visual/semantic pass.
- Failure/fallback: Missing Desktop or browser proof is an owned prerequisite, not an image placeholder or successful handoff. Do not imply the legacy full schema audit ran when only its regex was probed.
- NFR/security: No added telemetry store, upload step or approval side effect. All observations identify the source/build and actual exercised surface.
- Verification: VER-005 — behavioral evaluation of successful/failed/unavailable export and unsafe/manual-edit scenarios under fixed tools; evidence `delivery-behavior-review.md`.

### SRS-006: Measure reader usefulness without changing its target

- Statement / priority / status: The human validation owner shall evaluate the paired baseline/candidate exercise in AC-06; Must; approved design, implementation unverified.
- Source: REQ-VIS-006, AC-06; HLD-001 → CMP-002/003; no additional component contract.
- Behavior: Fix applicable questions and scoring before comparison, use the same six approved scenarios and comparable reading scale, retain incorrect answers/corrections and configuration. A person other than the implementation author should answer without coaching. Record non-applicable questions and their denominator explicitly.
- Failure/fallback: Missing participants/baseline or a failed target remains pending/failed usefulness acceptance. Do not substitute machine geometry, author self-scoring, an attractive sample or a performance screenshot.
- NFR/security: Carry the PRD metric/timebox unchanged; no new latency, financial ROI or delivery-date claim. Share only authorized non-sensitive fixture content.
- Verification: VER-006 — manual paired human acceptance, evidence `reader-comparison.md` owned by requesting maintainer.

### SRS-007: Recognize and classify amplification

- Statement / priority / status: CMP-004 shall explicitly connect design/review to canonical N+1 diagnosis; Must; approved design, implementation unverified.
- Source: REQ-PERF-001, AC-07; HLD-001 → CMP-004 → LLD-003.
- Behavior: Cover loops, lazy serializers/templates, aggregate-per-record access and GraphQL resolver fan-out. Identify entrypoint, repeated access, N and expected growth. Code-only evidence is suspected; planned behavior is design risk; instrumented execution may support observed amplification. Reject already-batched and spare-instance N+1 controls. Add only precise missing routing aliases if held-out routing evidence justifies them.
- Failure/fallback: When SQL/trace is unavailable, ask for the smallest observation required; never fabricate counts or use an EXPLAIN plan as a request counter.
- NFR/security: Reference exact/generated SQL safely and redact real query values; examples use synthetic data only. Keep short guidance in SKILL.md and detail in references, not copies of each ORM recipe.
- Verification: VER-007 — behavioral held-out N+1 recognition and non-keyword routing cases, fixed model/tools with independent adjudication; evidence `nplus1-recognition-review.md`.

### SRS-008: Select a bounded semantics-preserving remedy

- Statement / priority / status: CMP-004 shall choose a remedy from the actual access pattern and invariant; Must; approved design, implementation unverified.
- Source: REQ-PERF-002, AC-08; HLD-001 → CMP-004 → LLD-003.
- Behavior: Compare needed fields, parent/child cardinality, aggregates, JOIN row multiplication, hydration/serialization, batching, request-scoped keyed loading, parent pagination, ordering, snapshot needs and scope filters. Prefer the smallest justified change, not one giant JOIN. A table/prose may explain the choice; a `1 + N` sequence/dataflow is optional and preserves existing edge styles.
- Failure/fallback: Insufficient constraints produce a specific evidence/decision gap. No cache-first, index-only, concurrent-per-row or generic eager-load-everything “resolution.” Request-local DataLoader must not become a cross-request/tenant result cache.
- NFR/security: Preserve authorization/tenant predicates and empty-relation/result shape; no raw interpolation of values or unbounded collection prefetching justified solely by query count.
- Verification: VER-008 — behavioral constrained-remedy evaluation with pagination/high-cardinality/aggregate/scope counterexamples; evidence `nplus1-remedy-review.md`.

### SRS-009: Exercise a real bounded query entrypoint

- Statement / priority / status: CMP-005 shall implement the isolated reproducible query fixture in LLD-004; Must; approved design, implementation unverified.
- Source: REQ-PERF-003, AC-09; HLD-001 → CMP-005 → LLD-004.
- Behavior: Run baseline, bounded candidate and negative controls through real sqlite3 queries. Compare independently specified expected parent/child results and pagination while measuring emitted SELECTs at the approved N values. Capture child fan-out, returned rows/serialized bytes, elapsed time/environment and fingerprints. The intentional baseline must fail the candidate bound for larger N; N=1 alone is inconclusive.
- Failure/fallback: Any result mismatch, scope leak, unexpected query growth or failed control produces nonzero failure and retained evidence. An unavailable model/eval runner is NOT RUN, not replaced with mock statements or keyword scores. SQLite does not certify a specific ORM/production database.
- NFR/security: In-memory synthetic data only, parameterized values, bounded page/batch parameters; no application credentials, service startup or network. Timing is an observation, not a speed target.
- Verification: VER-009 — real query-entrypoint integration plus independent AC-07/08 judgment evidence; evidence `nplus1-runtime.json` and `nplus1-acceptance-review.md`.

### SRS-010: Preserve trace identities across machine auditing

- Statement / priority / status: CMP-006 shall accept the generic bounded ID forms in LLD-005 without weakening other record checks; Must; approved shared-contract design, implementation unverified.
- Source: PRD D-TRACE, all existing REQ/AC approval links; HLD-001 → CMP-006 → LLD-005.
- Behavior: Accept existing numeric forms and the approved qualified/short-width forms; keep IDs unchanged in PRD/SRS/run records. Do not add a second ID database, slug exception, alias, migration or new outcome field. Full audit still requires the exact requested record scope and valid workflow/status/cost/agent fields.
- Failure/fallback: Invalid IDs remain errors; unresolved dependency or rejected compatibility proposal leaves the audit blocked with IDs preserved, not normalized away or omitted.
- NFR/security: A schema pass is not approval, authorization, human acceptance or proof of fresh runtime evidence. Require independent regression review for unrelated validator behavior.
- Verification: VER-010 — local schema/required-scope integration once workspace dependencies are available; legacy/qualified/malformed cases and unchanged non-ID rejection behavior; evidence `trace-compatibility-review.md`.

## LLD-001 — Theme And Geometry Interface

Existing files: diagramming `scripts/render_drawio.py`, `check_layout.py`, `style_catalog.py`, `render_erd.py`, `validate_spec.py` and `references/diagram-spec.md`. One S2 implementation owner owns all shared changes. Exported-symbol changes require references discovery before editing; this document does not claim that future caller migration ran.

- Spec delta: optional `theme.mode` with exactly `light` or `dark`; absent means light. Existing `theme.accent` keeps its six-digit-hex rule and default. Unknown explicit modes are errors. Existing valid specs remain valid.
- Renderer delta: additive CLI `--theme light|dark`, overriding presentation mode without modifying source; omitted uses source mode/default. Preserve positional spec, `-o`, `--strict`, and explicit manual-edit acknowledgment semantics. Existing `render(spec)` callers remain valid; any optional library parameter is keyword-only and defaults to source mode. No global mutable palette or deprecated parallel renderer.
- Geometry: extend existing Layout/box planning rather than hand-author XML. Derive all label runs before sizing; use deterministic conservative wrapping/text estimation with font sizes and configured label width, then reserve complete footprints. Geometry used by strict checking must match emitted cell/label positions. Candidate channels are existing row/gap routes, not a new general graph engine. Account for special sequence/ERD, title, group and legend paths.
- Literal text: encode spec-origin strings before placing them inside internally generated `<b>`, `<font>` and `<br>` formatting. Text resembling markup is displayed literally; only renderer-owned markup is generated. XML attribute escaping alone does not establish that HTML-label content is safe.
- Compatibility: preserve all node/edge metadata and type semantics. Existing renderer strict-layout exit 2 currently occurs after writing output; keep that public behavior unless separately approved, and ensure the package wrapper treats it as failure and stages away from final output. Ordinary source/validation/write errors remain 1. Existing no-flag standalone output remains a supported lane.

## LLD-002 — Derived Local Package

New canonical surface: `skills/common/common-architecture-diagramming/scripts/export_html.py`. This is a future implementation path, not a file that already exists.

### Inputs and output ownership

CLI: `python3 export_html.py SPEC.json --output-dir DIRECTORY`, optionally `--manifest MANIFEST.json` for an explicitly selected related-view manifest. No auto-discovery, remote fetch or external artifact execution. Require trusted local ancestor directories, private operation-owned staging and an exclusively created private final directory; reject any existing final path, including symlinks. Create every final child exclusively without following symlinks; conflicts fail rather than overwrite. Hostile same-UID ancestor/directory replacement is outside this bounded threat model.

Outputs: `spec.json` containing the exact original bytes, `light.drawio`, `dark.drawio`, and `index.html`. The static page embeds both generated PNGs as data URIs; separate PNG files are not required. Exact-source snapshot and digest are stated in page metadata. A source snapshot is not an independently edited graph. Each draw.io file retains its own renderer baseline. Existing output paths are never automatically acknowledged or overwritten.

### Processing and errors

Use existing validation/render/layout/export functions without shell-string commands. An explicit manifest must validate canonically AND contain a validated view whose captured SPEC bytes match the selected input bytes; reject unrelated manifests, changed captures and canonical review_needed rather than validating an unrelated manifest independently. Stage privately, validate PNG signatures/positive dimensions and reject disguised SVG/HTML. Publish exclusive no-follow children with `index.html` last. Exit 0 confirms this invocation completed its publication/check sequence; file existence alone is not enduring completion, ownership, freshness or integrity evidence.

Return 0 only after successful checks/publication; 2 for usage/prerequisites (including unavailable Desktop/existing output path); 1 for invalid source/manifest, strict geometry, export or I/O failures. stderr names the failed stage and producer status. No retry/fake fallback. After final publication begins, retain and report incomplete final output on failure; never automatically unlink final entries or recursively remove final content, avoiding replacement/check-unlink races. Clean only operation-owned private staging. Existing outputs/input files remain untouched; generation success is not visual/semantic/offline acceptance.

### Static content contract

Emit a fixed HTML template with system fonts/local CSS and escaped metadata, labels/alt text and evidence summaries. Package rendering never dereferences citations or turns them into active links. Limited exception: explicitly requested canonical manifest validation may perform bounded, no-follow, allowlisted source-digest reads within its selected root, without embedding source contents. Embed PNG data only, never inline SVG, raw source HTML, script, iframe, forms, handlers or external resources. Do not generate absolute host paths or account details.

Use an early CSP meta element equivalent to `default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'`. CSS selects the embedded theme image; no script is required. CSP supplements escaping/PNG-only encoding. Verify offline-open separately from recorded attempted requests and CSP violations using interception or a controlled sink with external egress prevented; no successful egress is permitted. Observe Desktop export and browser consumption separately: HTML CSP does not govern Desktop. Do not infer CSP effectiveness or absence of network attempts merely from disabled networking.

Supported-input expectations: this local tool targets the existing fixture and representative project-view scale; no arbitrary-size SLA or invented node/image-byte ceiling is promised. Very large input/resource failures are explicit generation failures, not partial success. Any future numeric rejection limit needs evidence and a separate scoped contract decision.

## LLD-003 — Skill Integration And Evaluation Boundary

Owned guidance: `database-query-performance`, `system-design-data-architecture` and `system-design-review`; reference existing `system-design-communication` GraphQL guidance and the applicable ORM adapter only. Extend existing eval files where ownership fits; keep richer shared held-out prompts in existing `benchmarks/evals/` conventions rather than copy all ORM recipes.

The recognition contract is entrypoint + repeated access + N/growth + evidence classification. The remedy contract consumes cardinality/result/scope/pagination constraints and returns a reasoned smallest loading strategy plus verification need. These are authoring behaviors, not a new machine output schema. Preserve the existing review severity/evidence contract; do not declare a measured bottleneck from source alone or require SQL in a stateless/no-database design.

Held-out cases include hidden lazy loading, per-record count access, GraphQL resolver keys, large collections with page boundaries, repeated IDs in distinct tenant/request scopes, a slow constant-count query, a correct batched implementation and N+1 spare-instance redundancy. Freeze prompts, independent expected judgments, model/tools and scoring before comparison. Trace literal trigger/routing and semantic reasoning separately; simply containing “DataLoader” or “JOIN” is insufficient. Existing transcript scorers cannot certify result equivalence or database execution.

Use only an explicitly eligible/authorized evaluation account/model/runtime. `docs/EVALS.md` is the local execution reference, but its existence does not override host profile restrictions. Missing authorization, quota or authenticated runtime remains an owned NOT RUN gate; no automatic premium or unchecked account fallback.

## LLD-004 — Real N+1 Fixture Contract

New canonical runtime surface: `skills/database/database-query-performance/scripts/nplus1_smoke.py`. A focused behavioral regression under the same script directory may verify its consumer-visible bound/result behavior; no source-text or mock-call choreography tests. This future fixture is not the design-time throwaway experiment.

Use Python stdlib sqlite3 with `:memory:` storage, foreign keys enabled, deterministic synthetic parent/child data, and explicit tenant/request scope parameters. Dataset: at least 50 ordered parents in a primary synthetic scope, a second scope with overlapping local IDs, and deterministic child counts containing zero, one and multiple children. High-child-count and aggregate-only variants exercise whether a relation list or aggregate is actually needed. No real customer data or credentials.

Public fixture behavior: invoke the script without DB connection flags to seed and exercise its own synthetic database; it emits a JSON receipt and returns 0 only when its independent expected-result and declared query-bound/control checks pass. Invalid internal scenario/configuration or any mismatch returns 1 with the scenario and failed invariant, never a successful partial result. Tests may invoke its Python entrypoint to vary fixed scenarios; this is not a general SQL execution CLI.

- Baseline: ordered, scope-filtered parent page, then one child query per returned parent. Deliberately labeled faulty educational baseline; it is never the candidate implementation.
- Candidate: the same parent page, then one parameterized child query for that page's keys, grouped by parent and ordered deterministically. Empty pages perform no child query. Use a fixture page/batch cap of 50 keys; this is an illustrative bound, not a product capacity promise. IDs and scope values are bound parameters; only placeholder syntax may be assembled from a validated bounded key count. Group by scoped identity, not a process-global ID cache.
- Counts: for one selected relation, N>0 within the fixture cap has Q_base=1 and one child batch, hence two SELECTs; empty parent pages have one. Baseline is 1+N. Parent counts 1, 10 and 50 are required; N=1 cannot discriminate the two shapes, so larger N and the negative controls are mandatory. Do not impose this exact two-query rule on every ORM/application request.
- Expected results: explicit deterministic fixture expectations, including page order, offset/seek continuation, empty relation, no duplicated/skipped parent, second-scope isolation and selected child shape. Do not use the baseline output as the only oracle; both implementations can be equally wrong. The baseline/candidate comparison is supplemental.
- Instrumentation: `Connection.set_trace_callback` observes real emitted SQL during each read; scope it to the scenario/read phase after setup/seed/commit, and clear it afterward. Record SELECT statements/counts, stable normalized fingerprints, returned parent/child row counts, UTF-8 serialized result bytes, elapsed time and Python/SQLite environment. No cross-scenario/global query counter and no fabricated wire-byte metric; serialized result bytes are not transport bytes.
- Controls: correctly batched loading and aggregate projection must not be flagged merely for using multiple statements. The intentional baseline must violate the candidate bound for N=10/50. SQL result shape, pagination, scope, fan-out/rows and timing remain independent of statement count. Retain failed observations.

No timing speedup threshold, query-plan index recommendation or PostgreSQL/ORM performance guarantee is imposed. Applicable real-framework behavior remains a separate skill/evidence question; extend the runtime only for a specifically approved adapter hypothesis.

## LLD-005 — Bounded Trace-ID Compatibility

Original target: existing `scripts/outcome/schema.ts` trace-pattern validation and focused tests. Subsequent explicit approval extends the same formal grammar to `scripts/trace` parser/graph consumers and focused tests after the actual required audit failed. Preserve historical source-group mappings, unrelated workflow/cost semantics and exact-scope checks; do not renumber producers or introduce an alias registry. Grammars:

- `brd_objectives`: `^BRD-OBJ-(?:[A-Z][A-Z0-9]*-)?\d{3,}$`
- `requirements`: `^REQ-(?:[A-Z][A-Z0-9]*-)?\d{3,}$`
- `acceptance_criteria`: `^AC-\d{2,}$`
- `srs`: retain `^SRS-\d{3,}$`.

These accept current numeric forms and the approved single-namespace VIS/PERF forms without special-casing this slug. Reject blank/lowercase/path/whitespace/wildcard/placeholder/multiple-namespace forms and one-digit acceptance-criterion suffixes. Keep existing placeholder checks, complete trace fields and required run identity. Existing records are not rewritten. Before implementation, inspect exported validator references with the available code-intelligence tools and migrate affected callers/tests if a real contract dependency exists; this design is not a references-run claim.

The design-time legacy compatibility probe rejected all 20 existing objective/requirement/AC IDs; full native audit did not execute because workspace tsx/node_modules are missing. The proposed grammar has a bounded independent input corpus, but a source-only regex check is not a full run-record regression test. Installing dependencies and implementing this shared-contract extension require their normal authorization/readiness gates. If not approved, preserve D-TRACE as a blocker; do not empty the record or relabel IDs.

## Compatibility, Failure Analysis And Rollback

| Adverse timeline | Invariant / response | Owner |
| --- | --- | --- |
| Renderer layout finds a collision after staging XML | No final package completion page; preserve strict failure and do not ship the staged XML as visually approved | S2/S3 implementers |
| Light export succeeds, dark export fails | No completed static package; independent light evidence remains a limited observation, not two-theme success | S3 |
| A second process creates output directory during generation | Exclusive reservation fails without replacing it; no retry/overwrite | S3 |
| A foreign child/path appears or a published file is replaced during a failed operation | Exclusive no-follow child creation rejects conflicts; retain/report incomplete final output, never automatically unlink final entries or recursively delete it; clean private staging only | S3 |
| Label contains tags, event handlers, URLs or closing-script text | Display escaped literal text; PNG-only page and CSP provide independent barriers; security gate requires actual browser proof | S2/S3 and independent security reviewer |
| Shared theme styles leak between sequential renders | Per-render palette; source/spec and other theme unchanged; compatibility failure blocks acceptance | S2 |
| Batch lookup crosses tenant or page boundary | Result/scope oracle fails regardless of improved query count | S5 and independent verifier |
| Fewer SQL statements increase returned rows/bytes or latency | Report observations and reject an unjustified universal remedy; count alone cannot pass result/fit judgment | S4/S5 |
| Native audit cannot run or rejects IDs | NOT RUN/full audit or FAIL/format compatibility; do not substitute schema validity with approval or empty trace | Tooling maintainer |

Compatibility rollout: preserve legacy no-theme source and no-flag renderer/export usage; update schema documentation and consumers together; do not create deprecated aliases or independently edit installed agent copies. Existing golden changes need intentional review of semantics/visual effects, not blanket regeneration. Before authorized publication, update canonical docs/changelog, regenerate existing host exports, check ID/resource parity and real consumer discovery. No deployment or gallery release is part of this design approval.

Rollback before publication: restore the previous verified canonical implementation and regenerate derived artifacts, retaining the original JSON and approvals. Users may discard new static packages independently. For trace compatibility, stop new qualified-ID production if reverting the validator; never rewrite historical approval records. There is no production DB/data migration or irreversible service cutover in this scope.

## Review, Readiness And Receipt

Human baseline design approval and Personal review authorization were explicitly recorded. Architecture reviewer `4811d741-1477-45a7-85e2-56b9a967f10f` and security reviewer `53968879-ec1a-44e4-b79f-3a93e9a0aeb7` completed read-only reviews through Personal · Analysis & Review (`omp/openai-codex/gpt-6.1-sol`, requested medium effort, write-approval mode; effort application not exposed by launch receipt). Both cleared the applied narrow delta without residual material design blocker; the [review receipt](design-review-system-design-visualization-improvements.md) preserves revision scope and findings.

Independent documentary review is complete; the maintainer has now explicitly approved its narrow correction delta, Subagent-Driven execution and focused baseline repair. Existing source/verification results are preserved as failing-before evidence, not waived. No premium fallback, package installation, live model evaluation or publication is authorized.

Implementation is authorized within the [bounded execution packets](../../artifacts/evidence/system-design-visualization-improvements/execution-plan.md), one owner per shared component. Native environment gaps remain explicit; no full-plan verification or human usefulness acceptance is claimed merely from dispatch.

- [Design walkthrough and exact observations](srs-walkthrough-system-design-visualization-improvements.md)
- [ADR](../adr/adr-system-design-visualization-improvements.md)
- [Design run record](../../artifacts/runs/system-design-visualization-improvements/design-system-design-visualization-improvements-20261105.json)
- Canonical source references: diagramming renderer/validator/checker/style/export files; database-query-performance; system-design-data-architecture/review/communication; `scripts/outcome/schema.ts`; `docs/EVALS.md`.
- Exact actor-complete token/cost telemetry is unavailable. Source inspections, generated artifacts and tool results are distinct from enforcement or approval.

## Next Workflow

Proceed through approved bounded implementation, resolving the baseline discrepancy intentionally before dependent image acceptance. Parent integrates and verifies frozen outputs; independent implementation review remains required. Native dependency/schema checks, live evaluation and human usefulness/publication gates retain their separate evidence/authority boundaries.
