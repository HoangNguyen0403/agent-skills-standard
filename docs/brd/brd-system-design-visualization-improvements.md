# Brief: Evidence-preserving system-design visualization improvements

lane: direction; snc_tier: medium; approval: approved(requesting-maintainer, 2026-11-05)

- Slug: `system-design-visualization-improvements`
- Workflow: `brainstorm-feature`; mode: interactive; operator_profile: technical
- SNC: S=2 N=1 C=1 total=4 tier=medium. Crosses shared diagram tooling and consuming design workflows; extends existing behavior without changing runtime application architecture.
- Capability hint: standard; parent model: `openai-codex/gpt-6.1-sol`; actual parent effort: unknown. Two native read-only scouts collected bounded evidence; their model/effort were not exposed in their receipts. No implementation workers or premium advisors used.
- Repository status: approved brief saved; activation_status: not_required.

## Executive direction

Improve our existing architecture-visualization pipeline, borrowing presentation and delivery techniques from stack-diagram without replacing our semantic contracts. Our system-design reasoning and evidence model are already substantially stronger than a stack-to-picture workflow. The opportunity is to make those strengths easier to understand and share, not to substitute attractive diagrams for design validation.

### You said / I assumed

- You said: investigate caru-ini/stack-diagram, improve our system-design skills and visualization, and explain the concrete improvements we gain. You supplied architecture-tool and database-performance screenshots.
- Assumed: “design system” means system architecture visualization, not a UI component design system.
- Assumed: preserve the current JSON specification, editable draw.io deliverable, uncertainty handling, and review gates; do not install or execute upstream code.
- Assumed: the requesting maintainer is sponsor, validation owner, and handoff owner; maintainers and design authors are users. These are drafted defaults, not commitments by named third parties.

## Contract

### Outcome

Design authors can communicate an evidence-qualified architecture through readable, reproducible views and portable artifacts without losing identities, relationship meaning, provenance, or editability. Design/review skills must also notice N+1 query amplification, recommend an appropriate bounded loading strategy, and specify observable verification rather than merely warn about performance.

### Constraints

1. Keep diagram JSON as semantic authority, generated draw.io as editable presentation, and exported images/pages as derived copies.
2. Reuse existing diagram types, manifest identities, evidence confidence, metric provenance, manual-edit protection, and scope-aware semantic review.
3. Choose views for a named audience and question. Do not impose an all-views quota or mix C4 abstraction levels to imitate an upstream example.
4. Preserve current edge semantics. In our standard, dashed async edges are not equivalent to upstream dashed deployment/tooling edges. Styling must never silently reclassify a relationship.
5. Local generation must not publish architecture, prompts, labels, identity, or images externally. No gallery integration in this contract.
6. Any adopted code retains its MIT notice; fonts and vendor assets require their own license/provenance decisions. Upstream MIT does not license all logos.
7. No monetary ROI, throughput improvement, automatic architecture extraction, or collision-free guarantee without corresponding measured evidence.
8. Change canonical registry sources; do not independently edit generated agent copies. Later publication requires canonical-to-consumer parity checks.

### Non-goals

- Replace draw.io with manually authored HTML/SVG, or import upstream wholesale.
- Build a diagram editor, public gallery, React component generator, or arbitrary remote-asset downloader.
- Change application SQL, ORM usage, database topology, caching, or framework choices.
- Treat benchmark screenshots as a reproducible workload or capacity estimate.
- Implement this proposal during intake; approve spending, deployments, external sharing, or rollout.

### Acceptance criteria for visualization and required N+1 coverage

The approved scope and AC-01…09 identifiers are unchanged. Their active definitions, requirement mapping, owners and verification lanes now live in the [canonical PRD tables](../prd/prd-system-design-visualization-improvements.md#requirements-and-acceptance-criteria). This brief retains the decision rationale and approval history, not a second editable acceptance specification.

Canonical-definition relocation is recorded against this brief's pre-relocation SHA-256 `ea1270a08b12b91b3d8b81f64b585053d524f53565882ef4bd7e0f203839c4c1`. The PRD adds delivery decomposition without granting implementation authority.

## Capability inventory and scope slices

| Slice | Verb-object capabilities | Intake disposition |
| --- | --- | --- |
| A — Evidence-preserving visualization | Map source facts; select a view; lay out readable flows; render themes; export portable copies; inspect results | First slice: this brief and its acceptance criteria |
| B1 — N+1 detection and bounded loading | Notice repeated per-item access; choose a safe loading strategy; visualize amplification when useful; verify query growth and result equivalence | Required scope added by requesting maintainer; AC-07…09, alongside A; no application SQL changes during intake |
| B2 — Broader performance-design coaching | Trace request work; locate resource saturation; challenge unnecessary components; design equivalent measurements | Remaining lessons below stay candidates for a separate later brief |
| C — Vendor identity and nested deployment | Identify products; capture asset provenance; express real containment | Conditional enhancements after A; retain generic icons/split views until value and policy justify additions |

## Evidence: what stack-diagram actually offers

Inspected upstream revision: `1ed53e3e9525364ae5d82e0430f2bb3f7ef4c838` (2026-11-03). Links below pin that revision. Initial README and hero-image reads used main; findings about mechanisms use pinned source.

| Good point | Mechanism found | Improvement we gain | Limit we must not copy |
| --- | --- | --- | --- |
| Fast stack-to-picture vocabulary | Named technology plus short role; visibly grouped runtime/vendor/tooling areas | A concise presentation vocabulary makes the critical path easier to scan | Agent-inferred connections are not source evidence; do not invent topology from a technology list |
| Label-aware geometry | Geometry guide treats tile plus text as the full node box; vertical edges start below labels and elbows use clear corridors | Stronger routing/readability cases for our renderer, especially long labels and dense hubs | Rules guide manually authored SVG; there is no automatic router in the inspected build script |
| Consistent spacing and typography | Explicit row/column spacing, padding, display/monospace roles, and label halos | Stable visual hierarchy and more predictable review size | Fixed approximate boxes can fail with wrapped text; halos can disguise crossings |
| Two coordinated themes | Shared CSS tokens, dark variants, unchanged white logo tiles, paired logo assets | Readable screenshots in light/dark documentation and presentations | Browser CSS does not transfer directly to draw.io; theme fidelity must be demonstrated |
| Portable artifact | build.py inlines fonts/images and rejects unresolved recognized placeholders | Reviewers can open a local deliverable without access to an editor or logo host | Inlining alone does not audit all remote references or scripts; HTML must remain a derived copy here |
| Recognizable vendor/product identity | Official cloud branches plus logo-source fallback and a provenance manifest | Faster product recognition where the exact vendor matters | Mutable source URLs and provenance are not integrity/license guarantees; our Azure policy currently differs |
| Render-inspect-correct loop | Playwright screenshots and explicit visual inspection before handoff | Better actual deliverables than relying on machine-layout success | Screenshotting is implemented; visual correctness is not automatically asserted |
| Deliberate sharing consent | Preview labels/images/metadata and request two explicit confirmations before optional gallery upload | Useful reminder to separate generation from disclosure | Consent is an instruction, not enforced by share.py; exclude gallery execution entirely |

### Primary upstream sources

- [Workflow and mapping](https://github.com/caru-ini/stack-diagram/blob/1ed53e3e9525364ae5d82e0430f2bb3f7ef4c838/skills/stack-diagram/SKILL.md)
- [Geometry rules](https://github.com/caru-ini/stack-diagram/blob/1ed53e3e9525364ae5d82e0430f2bb3f7ef4c838/skills/stack-diagram/references/geometry.md)
- [Actual HTML/SVG template](https://github.com/caru-ini/stack-diagram/blob/1ed53e3e9525364ae5d82e0430f2bb3f7ef4c838/skills/stack-diagram/assets/template.html)
- [Build, icon, screenshot and sharing scripts](https://github.com/caru-ini/stack-diagram/tree/1ed53e3e9525364ae5d82e0430f2bb3f7ef4c838/skills/stack-diagram/scripts)
- [README and license boundaries](https://github.com/caru-ini/stack-diagram/blob/1ed53e3e9525364ae5d82e0430f2bb3f7ef4c838/README.md)

## Local baseline and concrete improvement map

| Priority | Current evidence | Proposed change and benefit | Likely component; scope fence |
| --- | --- | --- | --- |
| P0 | Eight view types, semantic JSON, provenance, manifests, strict geometry and image-inspection policy already exist | Preserve and expose these rather than create a second mapping format; retain auditable design meaning | Existing diagram spec/manifest and system-design workflows; no schema rewrite |
| P0 | `mermaid-fallback.md:11-18` contradicts the canonical skill: calls draw.io authoritative, invites hand refinement, and claims layout proves the picture | Reconcile guidance and exporter status; eliminate a real source of semantic drift and false visual confidence | Export reference and consuming instructions; no unrelated workflow redesign |
| P1 | Existing routing checks have documented cross-row/hub limitations; label overflow still needs human eyes | Improve complete-label bounds, spacing, route selection/findings and adversarial fixtures; fewer unreadable critical flows | Existing renderer/checker; no promise of a universal graph-layout engine |
| P1 | Fixed light palette; schema exposes accent rather than a dark preset | Coordinated light/dark style tokens and export inspection; usable in both documentation contexts | Style/export surface; one semantic spec, no duplicated graphs |
| P1 | Export wrapper supports PNG/SVG/PDF/JPG through Desktop, not standalone HTML | Add a minimal derived local HTML viewing package around verified output and metadata; less viewer/tool friction | Existing export surface; no second semantic renderer or interactive editor |
| Conditional | AWS/GCP shapes and generic cloud kinds exist; arbitrary logos/Azure artwork are not current catalog support | Evaluate an approved asset manifest with source, digest, license and theme variant only when recognition matters | Separate decision; generic symbols remain valid; no uncontrolled live fetch |
| Conditional | Visual groups are flat; manifest semantic ancestry is not visual containment | Support true nested containment only for a demonstrated deployment question; otherwise split views | Separate decision; never fake private/public placement from visual proximity |

### Local evidence ledger

| Claim | Status |
| --- | --- |
| Registry → CLI → installed project is the publication path | confirmed(ARCHITECTURE.md:7-25) |
| JSON is authoritative; image inspection is required; verified cloud-icon limits apply | confirmed(skills/common/common-architecture-diagramming/SKILL.md) |
| Eight types, evidence/confidence and metric provenance exist | confirmed(skills/common/common-architecture-diagramming/references/diagram-spec.md:34-113) |
| Rendering uses flat groups; planned orthogonal edges are implemented | confirmed(skills/common/common-architecture-diagramming/scripts/render_drawio.py:375-450,555-610) |
| Light palette and cloud catalog are implemented | confirmed(skills/common/common-architecture-diagramming/scripts/style_catalog.py:14-22,35-106,179-198) |
| Image export depends on external Desktop; wrapper does not offer HTML | confirmed(skills/common/common-architecture-diagramming/scripts/export_drawio.py:40-95) |
| Cross-row/hub and visual-check limitations are already documented | confirmed(skills/common/common-architecture-diagramming/references/layout-rules.md:47-57) |
| Export reference has source-of-truth/visual-proof contradictions | confirmed(skills/common/common-architecture-diagramming/references/mermaid-fallback.md:9-18) |
| Query/index-before-cache guidance already exists | confirmed(skills/system-design/system-design-data-architecture/SKILL.md:33-66) |
| Critical-flow reasoning already covers transformations, authority, invariants and verification | confirmed(skills/system-design/system-design-data-architecture/references/flow-contracts.md:5-26) |
| Framework-neutral N+1 diagnosis/remediation already exists | confirmed(skills/database/database-query-performance/SKILL.md:23-41) |
| ORM and GraphQL guidance already covers eager loading, aggregates and batching | confirmed(skills/laravel/laravel-eloquent/SKILL.md:35-38); confirmed(skills/laravel/laravel-database-expert/SKILL.md:24-38); confirmed(skills/spring-boot/spring-boot-data-access/SKILL.md:28-37); confirmed(skills/system-design/system-design-communication/references/communication-selection.md:9) |
| The inspected system-design-review subtree lacks an explicit N+1-to-database guidance link; existing eval definitions are not execution proof | confirmed(skills/system-design/system-design-review/references/mistakes-table.md:9-24); confirmed(skills/database/database-query-performance/evals/evals.json); bounded scout inventory, not a repository-wide absence claim |
| Upstream asset inlining is implemented, not automatic graph layout | confirmed(https://github.com/caru-ini/stack-diagram/blob/1ed53e3e9525364ae5d82e0430f2bb3f7ef4c838/skills/stack-diagram/scripts/build.py) |
| Maintainers need dark/offline outputs often enough to justify work | assumed; validate with AC-06 before broad publication |
| Present architecture-reading time, correction rate and installed export availability | unknown; validation owner establishes baseline and environment before execution |
| Screenshot throughput, $20 pricing and benchmark fairness/generalizability | unknown; primary benchmark source was not identified in two targeted searches; no benchmark was run |

No visualization-specific product ledger or conflicting brief was found in the inspected current-workspace docs inventory. The unrelated marketing ledger is not reused as evidence and no product IDs are minted. This is not a claim about other branches or external planning records.

## Performance-design lessons: required N+1 slice B1 and broader candidate B2

The screenshots are supplied secondary material, not verified benchmark evidence. Their useful contribution is a set of testable design questions:

1. **Locate the bottleneck before selecting a framework or adding a cache.** Separate application CPU, PostgreSQL CPU/I/O, query latency, pool wait, and event-loop/worker saturation. Shared-host resource percentages need a common denominator and measurement interval. Existing query-first guidance should gain a worked measured example, not another generic rule.
2. **Bound database work to the requested result.** Compare page-ID-first enrichment against wide joins on the same filters, order, dataset and response semantics. Verify deterministic pagination, total-count requirements, and snapshot/transaction behavior; two queries can otherwise observe inconsistent state. Do not prescribe the strategy without a query plan and workload.
3. **Expose transformation and round-trip cost.** Trace query → rows → ORM objects → JSON → response; annotate allocations, bytes, CPU and network waits when measured. Compare database JSON aggregation only where shape/security/maintainability and DB CPU trade-offs justify it. Raw SQL is not a universal improvement.
4. **Make concurrency and queueing explicit.** Evaluate pool size, queue bounds, timeouts, transaction duration, and blocking password work. Separate read/write pools or pipelining only when evidence supports them; both can change resource fairness, ordering and transaction constraints.
5. **Require equivalent benchmark contracts.** Record workload mix, think time, active virtual users versus achieved RPS, data distribution, password cost, durable write acknowledgment, cache rules, hardware/storage, p95/p99, error rate, warm-up, run length and repeated trials. Virtual users are not simultaneous executing requests or registered users. No “$20 server supports X users” sizing rule follows from these screenshots.

Potential later benefit: better bottleneck reasoning and fewer unnecessary components. No speedup, user-capacity or cost saving is earned or measured by this intake. No production-query changes belong in slice A.

### Required N+1 improvement plan

**Scope amendment:** On 2026-11-05, the requesting maintainer explicitly requested that skills notice or resolve N+1 and that this plan cover it. B1 is now required, not deferred with the broader performance-coaching ideas. The supplied image illustrates one parent query plus N child queries; its single LEFT JOIN is one possible alternative, not a universal optimization or measured result.

1. **Reuse and connect existing rules.** Keep `database/database-query-performance` as the diagnosis authority; integrate concise N+1 recognition/remediation references into `system-design-data-architecture` and `system-design-review`. Reuse `system-design-communication` for GraphQL and load only the applicable ORM adapter (for example Eloquent, TypeORM/PostgreSQL or JPA). Do not copy framework recipes into every design skill or alter the full ORM catalog without a demonstrated gap.
2. **Make diagnosis evidence-based.** Trace the request through collection fetch, loop/resolver/serializer and child/aggregate access. Capture redacted SQL fingerprints or downstream-call traces, parent/child counts and repeated parameters. Inspect generated SQL; distinguish query amplification from a slow constant-count query. EXPLAIN helps assess a selected query/index but cannot alone prove how often the request executes it.
3. **Select a bounded remedy.** Use eager/batch loading for required related records, aggregate projections when only counts/sums are needed, and request-scoped keyed batching for suitable resolvers. Compare JOIN row multiplication, payload and hydration cost against several bounded queries. Page parents before loading collections when necessary; explain transaction/snapshot needs and any per-parent child limits. Pipelining/concurrency can hide latency while retaining N+1 work; they are not proof of removal.
4. **Visualize only when useful.** Use a sequence or annotated dataflow view to contrast `1 + N` repeated calls with the selected bounded loading path. Show N/cardinality, batch size and query-count provenance as target/estimated/measured; label these as queries or remote calls, not a new “N+1” edge style. A picture is explanatory evidence, not a SQL trace.
5. **Extend behavioral evaluation, not just wording.** Reuse database/ORM evals; add held-out design-review cases for hidden lazy loading, aggregates, GraphQL, pagination, high fan-out and already-batched controls. Exercise AC-09 through a real database/query entrypoint for the chosen example. No global “exactly one query” rule; query count and resource cost must both be bounded and appropriate.

**Delivery ownership and order:** A and B1 remain separate implementation ownership boundaries, with one integrator preserving this contract. B1 can proceed independently of theme/export tooling once its exact canonical files and applicable framework example are selected during plan-feature. Broader B2, vendor assets and true nested groups remain outside this amendment.

**Benefit hypothesis:** Skills catch overlooked query amplification and avoid blanket JOIN/cache advice. No runtime issue in this repository, query reduction, latency gain or successful evaluation is claimed by this planning amendment.

**Retrospective candidate RETRO-NPLUS1-001 (proposed):** The original intake grouped database performance as later coaching and did not explicitly connect existing N+1 guidance to system-design review. Root cause: workflow/routing coverage, not absence of database knowledge. Owner: skill maintainer. Prevention: the AC-07…09 held-out detection/remediation cases and canonical cross-links above. Adoption/evaluation/independent review remain unverified; no instruction-file, policy or registry-source promotion is authorized by this note.

## Options and recommendation

### 1. Extend the existing pipeline — recommended

- Scope: first-slice contract above; borrow presentation principles, not upstream semantic authority.
- Load-bearing assumption: the existing draw.io export can produce a suitable visual asset for a minimal local HTML package.
- First failure condition: actual exports cannot preserve readability/provenance or necessary metadata without a competing renderer.
- Worst plausible case: theme/export work expands into maintaining two incompatible renderers.
- Cost to abandon: discard derived presentation changes while retaining specs, fixtures, evidence, and corrected guidance. Do not start a new renderer without revisiting the brief.

### 2. Adopt upstream as a separate stack-sketch tool — not selected

- Advantage: its authored HTML template, logos and two-theme screenshots are already concrete mechanisms.
- Load-bearing assumption: a lower-assurance sketch is sufficient for its users.
- First failure condition: a sketch is treated as evidence-qualified architecture or requires editable draw.io/manifest parity.
- Worst plausible case: duplicate semantic graphs drift; manually positioned HTML becomes an unreviewed design authority.
- Cost to abandon: migrate authored diagrams and asset dependencies. This does not meet the current preservation contract without additional integration.

### 3. Defer new presentation features — viable fallback

- Keep the current pipeline and correct contradictory guidance only.
- Load-bearing assumption: current reading/share friction is not materially costly.
- First failure condition: baseline exercises show recurring comprehension or access failures.
- Worst plausible case: maintainers continue manual export/style work and readers misinterpret views.
- Cost to abandon: low; resume from the measured baseline. Prefer this if AC-06 fails to demonstrate user value.

## Value, ownership and validation

- **Objective ID**: BRD-OBJ-VIS-001 — improve architecture comprehension without weakening semantic/evidence quality. Owner: requesting maintainer (assumed).
- Draft **SMART metric**: within 30 days after implementation begins, on the same six AC-06 scenarios, achieve at least 90% correct answers to the applicable reading questions and reduce median interpretation time by at least 20% versus the captured baseline, with no semantic/evidence regression. Targets and timebox are assumed acceptance proposals, not measured benefits or a delivery commitment. Fix the question set and scoring before comparing.
- **Objective ID**: BRD-OBJ-PERF-001 — make N+1 recognition and bounded-remedy reasoning observable in design/review. Owner: requesting maintainer; proposed validation target: before accepting B1, every applicable AC-07…09 held-out case identifies the amplification or correctly rejects the negative control, and the selected runnable example satisfies its declared query bound and result-equivalence checks. No latency threshold or improvement percentage is invented without a baseline.
- AS-IS: implemented evidence-rich JSON/draw.io pipeline with documented presentation limitations. Reader-time baseline unknown.
- TO-BE: the same semantic authority with demonstrably readable themes and a portable local view.
- Cost-benefit: expected cycle-time/accessibility benefit; no monetary estimate. Costs include text geometry, theme/export maintenance, browser/viewer compatibility and asset licensing if later selected.
- Stakeholders: requesting maintainer approves the brief and evaluates usefulness; diagram maintainer owns implementation integrity; design authors supply representative scenarios; human reviewers validate comprehension. Roles beyond requester are assumed, not assigned named people.
- Validation window: proposed 30-day evaluation window above; remote reviewers receive identical revision-bound artifacts and fixed questions. They can return corrections asynchronously; no fixed meeting required.

### Risks and owners

| Risk | Mitigation | Owner |
| --- | --- | --- |
| Attractive diagram masks invented topology | Preserve source confidence, IDs, semantic evaluation and explicit unknowns | Design/diagram maintainer |
| Offline HTML adds execution or disclosure surface | Derived local output only; no embedded untrusted code, external requests or public upload | Export implementer |
| Logos introduce licensing, mutation or contrast problems | Keep generic defaults; separately approve source/license/digest/theme policy | Registry maintainer |
| Added visual cases bloat skill prompts | Keep short rules in SKILL.md; place examples/geometry detail in references and reusable tools | Skill maintainer |
| New styling weakens existing semantic checks | Reuse all eight fixtures and independent semantic/visual acceptance | Integrator and separate reviewer |
| Targets fail or exporter prerequisites are absent | Report measured shortfall/NOT RUN; choose defer or revise direction explicitly | Requesting maintainer |

## Verification and handoff checklist

- [x] Inspect pinned upstream workflow/template/scripts and compare current local capabilities.
- [x] Identify existing reusable fixture and verification surfaces: `scripts/test_fixtures.py`, `test_check_layout.py`, `test_render_drawio.py`, `test_view_manifest.py`, and `assets/fixtures/` under the diagramming skill.
- [x] Distinguish source inspection and one upstream hero-image inspection from running a renderer, offline test, benchmark or live skill evaluation.
- [x] Separate visualization A, required N+1 slice B1, and deferred broader performance/vendor/nesting work; preserve negative evidence.
- [x] Obtain human brief approval; requesting maintainer replied “ok” on 2026-11-05.
- [ ] In plan-feature, promote REQ-VIS-001…006 and REQ-PERF-001…003 into the authoritative PRD once, retaining AC-01…09 links; resolve exact presentation packaging and N+1 skill/example integration from this contract.
- [ ] Discover real export availability; fix baseline questions/scoring before feature work. Export absence blocks only claims depending on export proof.
- [ ] Before multi-task implementation, settle Subagent-Driven versus permitted Inline execution separately. Brief approval does not settle that execution gate.
- [ ] Assign bounded components through eligible configured profiles; independent review must have a separate owner.
- [ ] Run relevant existing Python behavior checks and actual spec → draw.io → image → local HTML smoke; inspect both themes and open HTML with network disabled.
- [ ] Execute B1 held-out skill evaluation and instrumented query-growth/result-equivalence smoke separately from diagram checks; preserve failures and record NOT RUN when unavailable.
- [ ] If publishing skill updates, update canonical docs/changelog and verify generated consumer parity/discovery. Do not treat this brief as publication permission.

## Glossary

- Semantic authority: the representation defining identities, relationships and evidence; here, diagram JSON.
- Presentation: a visual encoding of that authority, not independent architecture evidence.
- Offline viewing: the delivered artifact renders without network access; generation may still require installed export tools.
- C4 level: context, container or component abstraction; do not mix these within a single C4 view.
- Runtime evidence: observed execution, distinct from a code citation or design instruction.
- N+1 query pattern: one collection query followed by per-item relation/aggregate queries (or analogous remote calls); distinct from N+1 spare-instance redundancy. A fixed number of batches is not automatically N+1.

## Approval

Approved by the requesting maintainer via “ok” on 2026-11-05; amended at their explicit request the same day to require N+1 detection, appropriate remediation guidance and verification (B1, AC-07…09), then explicitly approved via “approvve”. Both visualization A and N+1 B1 scope, including AC-01…09, are approved for planning. Approval accepts this Direction brief and scope amendment only; it does not authorize implementation approach, budget, premium calls, publication, deployment, gallery upload or runtime exposure.

## Outcome Report

```json
{
  "schema_version": 1,
  "run_id": "brainstorm-system-design-visualization-improvements-20261105",
  "slug": "system-design-visualization-improvements",
  "workflow": "brainstorm-feature",
  "feature_status": "requirements_ready",
  "started_at": "2026-11-05T07:10:42.935Z",
  "completed_at": "2026-11-05T07:14:36.606Z",
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-VIS-001", "BRD-OBJ-PERF-001"],
    "requirements": ["REQ-VIS-001", "REQ-VIS-002", "REQ-VIS-003", "REQ-VIS-004", "REQ-VIS-005", "REQ-VIS-006", "REQ-PERF-001", "REQ-PERF-002", "REQ-PERF-003"],
    "acceptance_criteria": ["AC-01", "AC-02", "AC-03", "AC-04", "AC-05", "AC-06", "AC-07", "AC-08", "AC-09"],
    "srs": []
  },
  "completed_evidence": ["Pinned upstream source inventory", "Local capability and prior-artifact inventory", "Upstream hero-image inspection", "MCP standards audit", "Human brief approval: requesting maintainer replied ok on 2026-11-05", "User-requested N+1 scope amendment and bounded existing-skill coverage inventory on 2026-11-05", "Explicit N+1 amendment approval: requesting maintainer replied approvve on 2026-11-05"],
  "missing_evidence": ["Reader baseline and comparison", "Actual export and offline smoke", "Primary performance benchmark source", "N+1 held-out skill evaluation and instrumented query-growth/result-equivalence smoke"],
  "decision_needed": [],
  "recommended_next_workflow": "plan-feature",
  "cost": {"source": "unavailable"},
  "agent": {"identity": "omp orchestrator", "model": "openai-codex/gpt-6.1-sol"}
}
```

`requirements_ready` means the approved contract is ready for planning, not implementation readiness. The completed_at above marks evidence synthesis; human brief approval was subsequently recorded on 2026-11-05.

## Open questions

The requesting maintainer accepted the architecture-visualization interpretation, preservation contract, drafted ownership and proposed visualization measurement targets, then explicitly added required N+1 coverage. Runtime/export availability and the exact representative N+1 framework/runtime example remain planning prerequisites to discover; neither reopens settled scope.

## Next workflow

`plan-feature` produced the [proposed PRD and delivery slices](../prd/prd-system-design-visualization-improvements.md). Next: `design-solution` for the bounded visualization/export and N+1 runtime contracts; plan approval and implementation readiness remain separate. For slice A, comprehension measurement fits the acceptance exercise; no separate market-value experiment is currently required.

## Cost Report

Called `get_session_cost(workflow="brainstorm-feature")` before handoff. MCP reported 14 calls, 11 unique loaded skills, one returned workflow body and zero category-guide bodies at that checkpoint. System-design is installed but has no category guide. Exact host tokens, complete actor costs and prices are unavailable; total cost and savings are not claimed. MCP consultation counts do not prove worker delivery, implementation, tests or runtime enforcement.
