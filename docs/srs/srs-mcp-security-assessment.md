# Technical Design: MCP Security Assessment and Evidence Report

slug: mcp-security-assessment
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
delivery_mode: extended
plan_approval: approved(requesting operator, 2026-11-10)
design_approval: approved(requesting operator, 2026-11-10)
repository_status: design_artifacts_only
activation_status: not_required
Owner: engineering/security maintainer; independent validation: Security and QA

## Decision Brief

- **Change from approved PRD:** Settle a guidance-only composition, explicit supplied-input envelope and Markdown report layout, coverage aggregation, target/evidence binding, no-clobber persistence and an instrumented installed-consumer verification protocol. Preserve every PRD criterion; add no target-runtime lane, scanner engine, MCP handler or default-install change.
- **Recommendation:** One thin optional workflow and one compact common skill with original demand-loaded mapping/report/consumer-case references. Reuse cyber-authorization, cyber-evidence and existing generation/catalog mechanisms. The consuming host owns enforcement; the skill never pretends to supply a sandbox.
- **Impact if wrong:** Scope escalation, unsafe writes, false security assurance or synthetic exercise output presented as target-runtime proof.
- **Evidence limits:** Existing architecture and disposable local-consumer mechanisms were inspected. Native model invocation/effect isolation is not established by the repository kit or capability table. This design is not implemented or exercised.
- **Owned readiness gap:** QA/host operator must provide versioned native consumer and filesystem/process/network enforcement evidence plus separately scoped model/account/data/resource approval before model-driven verification. Missing proof blocks that exercise, not safe authoring or supplied-artifact reasoning. No new host adapter is silently authorized.
- **Design approval:** Requesting operator replied “ok” on 2026-11-10 to the presented SRS and implementation-readiness-only gate. Approved source SHA-256: `4f8e9518be3ae8081d90f7bd445aafe35f7b7d0f13f30f5f9a9eef9dcf7642fc` (pre-approval SRS). No implementation approach, model experiment, dependency installation, publication, merge, target activation or spend is approved by this sign-off.

## Trace Source

Original work item: user requested a skill/workflow to scan/report MCP health against supplied OWASP/Cycode sources. [BRD](../brd/brd-mcp-security-assessment.md) approval binds pre-approval source `f2c2ec6fb2018947f086cc567d0e7c9efcda101b44511cf402d3e50acbdf3f40`. [PRD](../prd/prd-mcp-security-assessment.md) approval binds pre-approval source `e18701d94b6a57437262ef21ff4588d2fc68dc5cdfef0d5d0575399a293ca488`; operator replied “ok” to its technical-design-only gate. Actor/date: requesting operator, 2026-11-10. Scope owner: requesting operator / maintainer as PO. Source IDs: REQ-MCP-01..05, AC-MCP-01..16. No new business objective IDs and no redefinition of PRD ACs.

Design is approved for implementation-readiness only. S1 remains the single end-to-end slice; D0's technical contract is accepted, while O0 independent oracle acceptance and affected execution prerequisites remain outstanding. Design approval is not downstream coding authority.

## Architecture and Ownership

HLD-MCP-01: portable supplied-artifact assessment, intended for adopters, guidance author, registry integrator and independent verifier. Interaction is synchronous in one bounded assessment session; no queue, listener, database, model-serving component or scanner runtime. Dependency direction: workflow → domain skill/reference → existing governance/evidence owners; report references supplied artifacts, never executes them.

| Component | Owner | Responsibility / selected LLD | Failure domain |
| --- | --- | --- | --- |
| CMP-MCP-WORKFLOW | Engineer | Intake, scope, ordered assessment and persistence; LLD-MCP-FLOW | Missing scope or unauthorized effects: hold effect, preserve safe analysis |
| CMP-MCP-KNOWLEDGE | Engineer; Security reviews | Taxonomy/control guidance and transport distinctions; LLD-MCP-COVERAGE | Missing evidence produces coverage gaps, not invented safety |
| CMP-MCP-REPORT | Engineer | Human-readable report projection over canonical evidence; LLD-MCP-REPORT | Attribution, status or write conflict: do not publish misleading/overwritten report |
| CMP-MCP-PACKAGE | Integrator, coordinated by single S1 owner | Existing generator/catalog installation; LLD-MCP-PACKAGE | Missing resource or parity: source delivery fails, never fallback to hidden copies |
| CMP-MCP-ORACLE | Security distinct from author | Independently frozen expected observations; LLD-MCP-VERIFY | Circular/ambiguous expected result blocks affected case acceptance |
| CMP-MCP-HOST | Accountable host operator; QA validates | Filesystem/tool/network/process authority, observation and cancellation | Absent proof blocks consumer exercise; Markdown is not enforcement |

All paths pass through HLD-MCP-01. REQ-MCP-01 → CMP-MCP-KNOWLEDGE/CMP-MCP-REPORT → LLD-MCP-INPUT/LLD-MCP-COVERAGE/LLD-MCP-REPORT → SRS-MCP-01/02/07. REQ-MCP-02 → CMP-MCP-WORKFLOW/CMP-MCP-HOST/CMP-MCP-REPORT → LLD-MCP-INPUT/LLD-MCP-FLOW/LLD-MCP-VERIFY/LLD-MCP-REPORT → SRS-MCP-03/04. REQ-MCP-03 → CMP-MCP-REPORT/CMP-MCP-HOST → LLD-MCP-EVIDENCE/LLD-MCP-REPORT → SRS-MCP-04/05/06/07. REQ-MCP-04 → CMP-MCP-KNOWLEDGE/CMP-MCP-REPORT → LLD-MCP-COVERAGE/LLD-MCP-EVIDENCE/LLD-MCP-REPORT → SRS-MCP-02/06/07. REQ-MCP-05 → CMP-MCP-PACKAGE/CMP-MCP-ORACLE/CMP-MCP-HOST → LLD-MCP-PACKAGE/LLD-MCP-VERIFY → SRS-MCP-08/09. Requirement cards own the only VER mappings; this trace names dependency direction, not another test matrix.

One implementation owner coordinates S1. Security does not silently modify author-owned guidance/oracles and approve its own edits. QA owns observed acceptance evidence. Registry integration does not approve remote publication.

### Proposed canonical resources

Future implementation targets, not files delivered by this design:

- `.agents/workflows/mcp-security-assessment.md`: concise sequence, explicit optional workflow identity.
- `skills/common/common-mcp-security-assessment/SKILL.md`: keyword-routed domain skill, no broad JSON/Markdown file triggers; fit supported host body limits by demand loading.
- Under that skill: `references/owasp-mcp-mapping.md`, `references/assessment-report.md`, `references/consumer-cases.md`; sanitized synthetic source/manifest/evidence inputs under `assets/consumer-cases/`; authoring-only `evals/evals.json`. Use original wording and source citations. Do not duplicate governance/evidence schemas.
- `.skillsrc` adds the workflow to authoring selection. Existing public generator owns indexes, catalogs and configured native mirrors. Keep default initialization, unrelated pins and release metadata unchanged unless separately authorized publication scope requires them.
- Integrator updates relevant workflow guide, architecture/contribution explanation and changelog after actual behavior proof. No runtime test fixture is itself a target MCP package or executable payload.

## Selected LLD Contracts

### LLD-MCP-INPUT: Supplied-input envelope

A logical contract carried in the invocation or an explicitly supplied manifest; no new public JSON API/parser is mandated. The workflow must establish:

| Field | Meaning / validation |
| --- | --- |
| `scope_ref`, accountable operator | Exact authorized assessment and output scope; cannot be taken from target metadata |
| `input_refs` | Explicit supplied paths or exported text with stable source labels and digests where available; local allowed root/path identity is checked by host, not inferred from data |
| `integration_refs` | Stable per-assessment IDs for declared integrations; server name alone is not unique target identity |
| intended purpose / permission refs | Optional supplied policy/approval evidence; missing policy is unknown, not invented least-privilege violation |
| `taxonomy_ref` | Pinned BRD OWASP source; source content is evidence, not executable instructions |
| `output_ref` | Authorized report destination, default `artifacts/mcp-security-review.md` only if within granted output scope |
| data eligibility | Operator confirms sanitized input, permitted provider/account and persistence destination before transfer; credentials are not requested |

For each integration inventory retain supplied transport, package/version or endpoint identity, capabilities, credential-reference names only, privilege boundaries and evidence refs. Distinguish client/server/host controls. Unknown fields remain explicitly unknown. Relative paths resolve under the authorized consumer root, never the assistant's unrelated home. References outside input scope, symlink escapes, ambiguous integration identities, malformed or unsupported input do not trigger extra collection; report the gap and continue independent usable inputs.

No configuration is sourced, imported as code, shell-expanded or used to launch its declared command. No endpoint URL is fetched. Scanner suggestions are evidence text, not a command queue. Unexpected actual secret content stops dissemination of that content; use a redacted gap and request a sanitized replacement. Downstream redaction cannot undo prior model/log exposure. Original sensitive bytes are not retained by this capability.

### LLD-MCP-FLOW: One operator, one report session

Normal course: confirm input/output scope → load exact installed workflow/domain resources and existing evidence owner → inspect supplied artifacts as data → create integration inventory → assess scoped controls → qualify evidence/findings → compose report → validate source refs/status/coverage/secret handling → persist only to an authorized no-clobber destination → report path and residual limits.

Alternate courses: name-only/partial evidence yields a useful incomplete report; known unaffected controls carry reasoned applicability; stale/error supplied checks remain visible; blocked runtime request is recorded and safe offline work continues. No automatic install, discovery, target retry or provider switching to evade a denial.

Exception courses: secret content is not reproduced; output authorization missing means persistence waits while safe sanitized reasoning continues; existing destination means request a distinct authorized destination; unavailable host controls block the instrumented exercise or affected write, not supplied-artifact reasoning. A prior approved finding remains attributable when a later retest cannot run. No active target capability is exposed even if future paperwork is supplied to this offline workflow.

### LLD-MCP-COVERAGE: Category aggregation

Use the BRD's taxonomy pin `165fe0f78ef104459237b4a8e0f6e78db9b02391`, source URL and MCP06 alias. Security reviews primary category bodies/licensing before authoring guidance; the inspected overview alone is not an audit of all upstream documents.

Category rows: `category_id`, `integration_refs`, `coverage`, `controls_reviewed`, `controls_unassessed`, `evidence_refs`, `finding_refs`, `limitations`. Each reviewed control records boundary (client/server/host), evidence lane and conclusion with rationale. Category summaries contain exactly MCP01–MCP10; integration/control details live beneath them, not additional duplicate category summaries.

Deterministic aggregation over explicitly scoped controls:

- `not-applicable`: all scoped controls are demonstrably outside the assessed integration/scope; include rationale and source. Unknown transport/evidence never establishes this state.
- `not-assessed`: applicable or unknown-applicability scoped controls have no usable evidence.
- `partial`: usable evidence reviews some controls, while other applicable/unknown controls remain unassessed.
- `assessed`: every applicable scoped control has usable evidence for the stated lane; explicitly list scope and excluded runtime claims. No finding is implied by this label.

Aggregate category across integrations conservatively: any scoped evidence gap plus any reviewed control yields partial; with no reviewed controls use not-assessed unless all integrations have evidenced non-applicability. A confirmed static finding can coexist with partial coverage. “No findings identified in reviewed supplied static controls” is permitted; “MCP is safe,” universal clean badges and numeric health scores are not.

Transport rules: absence of remote OAuth configuration on stdio is not a finding. Inspect available local identity/environment/provenance/permissions evidence. Missing client-side HTTP credentials does not prove anonymous server access; report server authentication/authorization unknown unless supplied evidence establishes it. An appropriate evidenced mechanism need not be OAuth merely to avoid a finding.

### LLD-MCP-EVIDENCE: Binding and statuses

Reuse [canonical evidence record](../../skills/cybersecurity/cyber-evidence/references/evidence-record.md) and [cyber-evidence](../../skills/cybersecurity/cyber-evidence/SKILL.md); do not fork their field names/enums. Canonical finding statuses are confirmed, suspected, blocked, not-tested, false-positive. No fabricated finding record is required for a category with no finding.

Bind supplied evidence to integration identity, source revision/control applicability and original collection provenance/time where available. Record current inspection separately. Missing timestamps/revisions stay unknown; hashes establish bytes, not trusted origin. If required canonical metadata is unavailable, the evidence record explicitly states unknown plus its limitation rather than manufacturing provenance. Supplied runtime results retain supplied fidelity, not executed-by-assessor fidelity.

A scanner-only positive is suspected without independent corroboration. Source plus independently corroborated policy/evidence may justify confirmed status without an exploit run. Mismatched revision, changed control, stale applicability or scanner error/empty output cannot establish a current clean result. No arbitrary age cutoff. Preserve historical findings and append new limitations; failed/blocked retest is not false-positive evidence or a reason to mechanically copy blocked action state into finding_status. An actually disproven claim needs independent invalidating evidence.

### LLD-MCP-REPORT: Markdown projection and persistence

One standalone Markdown artifact with the following stable sections:

1. **Scope and Provenance** — scope/operator ref, installed workflow/skill identities, taxonomy pin, supplied artifact identity, inspected-at versus collection times, destination.
2. **Integration Inventory** — LLD-MCP-INPUT attributes, explicit unknowns and control boundaries.
3. **OWASP Coverage** — LLD-MCP-COVERAGE category table and bounded control details.
4. **Findings** — canonical evidence fields plus finding ID, affected integration/control/category, severity rationale, confidence/verification state, impact, remediation owner and retest expectation. Link canonical remediation guidance rather than duplicating it. Mark absent severity/confidence basis unknown; no invented CVSS score.
5. **Evidence Lanes and Limits** — supplied static, supplied runtime and actually executed assessment operations distinguished; target checks not executed in this delivery. Missing/error/stale evidence and unsupported host effects remain explicit.
6. **Remediation and Handoff** — owner-role actions and sanitized evidence needed; no auto-fix or generated executable payload.

Human Markdown is the output contract; no machine JSON compatibility promise, database, queue, webhook or new MCP tool. Tables/wording may evolve while the named information and canonical semantics remain. The branch security-test's `artifacts/security-review.md` remains untouched; a continuous workflow chain may link this standalone report under its canonical owner rather than forking statuses.

Report persistence is a separately authorized local output effect. Confirm destination eligibility and no pre-existing unrelated content; use an existing host operation that enforces create-new/no-clobber within the authorized output root. Host must resolve/reject path escape/symlink traversal and protect against concurrent replacement while writing. Do not claim check-then-overwriting `write` is atomic protection. If create-new/path enforcement is unavailable, do not persist through an unsafe fallback: request an operator-controlled safe destination/write and mark report persistence unverified. That session cannot satisfy saved-report acceptance until observed safe persistence occurs.

Same-input reruns create distinct authorized outputs; no in-place historical finding rewrite. A concurrent writer wins or causes a visible conflict, never silent overwrite. Write failure retains safe rendered analysis and explicit unpersisted status; no automatic force/rename or target action. Host-authorized staging/atomic promotion may be used only if it preserves no-clobber and output scope. Retention is operator-owned, not a new timed retention service; preserve sanitized acceptance receipts and delete only explicitly owned disposable state after capture.

### LLD-MCP-PACKAGE: Optional delivery

Workflow source and domain skill are distinct installable identities. Configure explicit authoring workflow selection; use existing public `generate-indices` entrypoint and managed catalog/sync APIs. Generator owns resource routing and host mirrors; eval definitions are authoring inputs, not assumed exported resources. Do not introduce broad file triggers, new runtime adapters or per-skill MCP handlers. Missing body/resource/catalog identity fails delivery; fallback to an unrelated current-worktree copy does not prove installed-consumer acceptance.

Existing CLI/API temporary consumer mechanism can validate installed bytes, lock provenance and WorkflowIndex discovery. It cannot by itself establish native invocation/model compliance or enforcement. Any supported host surface can satisfy packaging parity according to its transformer contract; one actual native consumer must satisfy semantic acceptance before S1 is complete. No claim that every provider/model behaves identically.

### LLD-MCP-VERIFY: Independent consumer procedure

This is the required procedure, not an implemented runner or permission to run it:

1. Freeze eligible account/host/model/version, exact native invocation, source/resource/fixture digests and separate exercise authority. QA identifies allowed model-provider control-plane traffic independently from forbidden target/tool network activity. Do not transfer repository data to an ineligible provider.
2. Security freezes sanitized input cases and independent expected observations before answer grading; author output is not its own oracle. Cases: vulnerable policy/scope mismatch, clean-within-supplied-scope, name-only, hostile metadata, stdio/HTTP contrast, scanner stale/error/positive, blocked runtime request, output collision and full inventory. These are input variants of the PRD ACs, not new product capabilities.
3. Use the existing local installation APIs in a uniquely owned disposable consumer; select only this workflow/domain skill and dependencies. Record catalog/lock/resource identity. No registry download or target MCP registration is needed for local-source verification.
4. Before model invocation, host operator demonstrates input-only reads, authorized output create-new, no target subprocess/tool execution, no target network access, no ambient credentials/home access, observable denied attempts and cancellation. Model transport may be outside the tool sandbox under its separately approved provider grant. An unrelated synthetic canary outside the read allowlist verifies forbidden collection without using real secrets. No access to broad shell/network/MCP tool surfaces is granted to the assessor.
5. QA records actual supported native selection/invocation and delivered workflow/domain bodies; then provide the frozen scope envelope. A raw skill-only prompt without native workflow discovery cannot satisfy AC-MCP-05.
6. Capture report bytes, source identity, input/oracle refs, actual tool/process/network/filesystem effect observations and denied attempts. Compare inventory, category/finding semantics and safety against the independent oracle; do not grade keyword presence as semantic correctness. Allowed file reads/report writes and host control-plane model traffic must not be misclassified as target effects.
7. Confirm saved artifact identity/no-clobber, output-collision preservation and no forbidden collection; record each exercised case separately. A denial proves the bounded exercise's permission boundary, not that an MCP server is safe. Preserve report/effect/grade evidence before cleanup; remove only owned disposable state.
8. Missing native driver, enforcement/observability, provider grant or independent oracle yields NOT RUN/blocked for affected exercise, never synthetic PASS. Do not implement a host adapter, purchase a scanner or replace native acceptance with mock echoes to conceal that gap. Source preparation and offline authoring can remain complete; S1 remains incomplete without actual consumer proof.

The current repository kit explicitly excludes native model invocation and supplies no universal host sandbox guarantee. No concrete runtime host is claimed ready by this design. The host operator must bind and prove a versioned existing native host at readiness; this is an environmental acceptance prerequisite, not an unspecified assessment algorithm. Native host command syntax is recorded from that host, not fabricated here.

## Technical Requirement Cards

All cards: priority Must; status Design approved for readiness only, not implemented/tested; implementation owner Engineer unless Integrator is named. Statements reference LLD contracts rather than duplicate ACs. VER IDs identify the sole mapping for each card; artifact paths are future evidence destinations, not existence claims.

### SRS-MCP-01 — Scoped inventory

Source: REQ-MCP-01, AC-MCP-06, AC-MCP-08, AC-MCP-16. Behavior: apply LLD-MCP-INPUT, preserving unknowns and boundary attribution on malformed/partial input. Failure: no collection fallback. Security invariant: declarations never authorize reads, fetches or execution. Verification: VER-MCP-01, independent consumer semantic exercise — `artifacts/verification/mcp-security-assessment/inventory-review.md`.

### SRS-MCP-02 — Pinned category coverage

Source: REQ-MCP-01/04, AC-MCP-01, AC-MCP-04. Behavior: aggregate via LLD-MCP-COVERAGE; unavailable evidence cannot become assessed/not-applicable. Failure: explicit gap, not clean status. Security invariant: coverage never certifies safety. Verification: VER-MCP-02, independent consumer semantic exercise — `artifacts/verification/mcp-security-assessment/coverage-review.md`.

### SRS-MCP-03 — Data and effect boundary

Source: REQ-MCP-02, AC-MCP-02, AC-MCP-07, AC-MCP-11, AC-MCP-14. Behavior: LLD-MCP-INPUT/FLOW/VERIFY separate untrusted data, provider transfer and target effects. Failure: hold affected effect, preserve safe analysis. Security invariant: no target launch/network/invocation or unrelated collection. Verification: VER-MCP-03, instrumented native-consumer exercise — `artifacts/verification/mcp-security-assessment/effect-observations.json`.

### SRS-MCP-04 — No-clobber output

Source: REQ-MCP-02/03, AC-MCP-05, AC-MCP-15. Behavior: LLD-MCP-REPORT enforces authorized destination and create-new through host capability. Failure: no overwrite/unsafe fallback; unpersisted report is not saved acceptance. Integrity invariant: preserve unrelated and historical evidence under collisions/concurrency. Verification: VER-MCP-04, installed-consumer persistence exercise — `artifacts/verification/mcp-security-assessment/output-review.md`.

### SRS-MCP-05 — Evidence-qualified findings

Source: REQ-MCP-03, AC-MCP-03, AC-MCP-09. Behavior: LLD-MCP-EVIDENCE/REPORT use canonical fields, scanner corroboration and actionable remediation. Failure: missing basis remains unknown/suspected, not invented certainty. Security invariant: no raw secrets or unearned exploitation claim. Verification: VER-MCP-05, independent consumer semantic exercise — `artifacts/verification/mcp-security-assessment/findings-review.md`.

### SRS-MCP-06 — History and fidelity

Source: REQ-MCP-03/04, AC-MCP-10, AC-MCP-12. Behavior: bind evidence to source identity/time and preserve historical findings under retest failure. Failure: current applicability unknown without deleting history. Integrity invariant: supplied evidence never becomes a fabricated executed check. Verification: VER-MCP-06, independent consumer semantic exercise — `artifacts/verification/mcp-security-assessment/fidelity-review.md`.

### SRS-MCP-07 — Stable human report

Source: REQ-MCP-01/03/04, AC-MCP-01, AC-MCP-03, AC-MCP-04, AC-MCP-16. Behavior: expose the LLD-MCP-REPORT sections, shared statuses and scope-qualified conclusions. Failure: unsupported assertion rejects report acceptance. Security invariant: no universal health badge or scoring promise. Verification: VER-MCP-07, independent report-contract review of actual consumer output — `artifacts/verification/mcp-security-assessment/report-review.md`.

### SRS-MCP-08 — Optional installed resources

Source: REQ-MCP-05, AC-MCP-05, AC-MCP-13; owner Integrator. Behavior: LLD-MCP-PACKAGE delivers exact installed bodies/resources through existing ownership/catalog paths. Failure: missing identity/resource blocks source acceptance. Integrity invariant: no hand-edited mirrors or default selection expansion. Verification: VER-MCP-08, existing local-consumer install/discovery and generation checks extended to the new resources — `artifacts/verification/mcp-security-assessment/delivery-receipt.json`.

### SRS-MCP-09 — Independent behavioral acceptance

Source: REQ-MCP-05, AC-MCP-05 and all referenced consumer criteria; owner QA. Behavior: LLD-MCP-VERIFY binds independent oracle, native invocation and actual output/effects. Failure: missing observed lane is NOT RUN; no mock/lexical substitute. Assurance invariant: finite exercise proves bounded response behavior, not general MCP safety or measured efficacy. Verification: VER-MCP-09, independently adjudicated native-consumer exercise — `artifacts/verification/mcp-security-assessment/acceptance.md`.

## Failure, Migration and Rollback

No database or external service migration. Optional guidance adds new identities; existing security-test, evidence enums, Doctor and cloud preflight retain their owners/behavior. Do not repin unrelated packages. Existing artifact ownership and user-edit preservation rules apply to generated changes.

Failure modes: malformed artifact → partial report; missing permission policy → unknown scope claim; identity/revision mismatch → no evidence merge/current-negative claim; scanner error → unassessed/partial; metadata injection → suspected allegation unless corroborated, no action; output collision/race → no overwrite; insufficient host proof/provider grant → exercise blocked; missing resource → delivery failed; semantic mismatch → reject affected report/case. No automated target retries, fix deployment or credential rotation.

Rollback removes/reverts only authorized owned candidate source/selection/generated changes using existing ownership-preserving sync/generation; do not delete user-edited resources or historical reports. A failed consumer exercise blocks acceptance/promotion, not historical evidence preservation. Repository source preparation is not remote publication. Cancellation/cleanup require host-observed ownership and stop conditions; report residual/unverified cleanup honestly.

NFRs are categorical invariants above. No throughput/availability/latency SLA or arbitrary execution duration was supplied. Resource cap and finite stop window must be explicitly bound in separate exercise authority before model invocation; unknown values do not become unlimited consent.

## ADR-MCP-01 — Offline MCP Assessment Composition (Design Approved)

Context: generic SAST/SCA and registration checks do not establish MCP security posture; metadata, scopes and context are distinct evidence surfaces. Existing registry architecture distributes guidance rather than executing a daily command runtime.

Decision: optional thin workflow + common demand-loaded skill; canonical cyber evidence/authorization unchanged; standalone human Markdown report with coverage separate from finding status; supplied-only first delivery; installed native consumer behavior is required independently from source/export checks. Host enforcement and model exercise authority remain external prerequisites.

Alternatives: extend only generic security-test (less surface but weaker explicit MCP intake); add scanner runtime/gateway (outside approved scope). Revisit the entry point only if existing routing demonstrates equivalent coverage/discoverability, preserving approved outcomes.

Consequences: low runtime coupling, explicit unknowns and abandonable guidance; maintaining mapping and native consumer evidence is required. No certification, universal sandbox or provider-parity claim. This scoped design decision amends no existing global ADR; integrate its bounded decision with existing ARCHITECTURE.md conventions only during authorized implementation.

## Status, Readiness and References

Lifecycle: design_ready based on scoped human design approval, not merely the saved file. No implementation, consumer run, scanner test or human delivery acceptance occurred. [Walkthrough](srs-walkthrough-mcp-security-assessment.md) records actual design checks, unrun lanes and readiness disposition.

Remaining readiness gates before S1: independent oracle acceptance; selected execution approach and eligible named owner; dependency/tooling restoration under matching authority; separately approved eligible model exercise; host/native/effect/no-clobber capability proof. Host proof is required for the affected exercise, not a reason to block safe supplied-artifact analysis.

References: [approved PRD](../prd/prd-mcp-security-assessment.md), [BRD](../brd/brd-mcp-security-assessment.md), [architecture ADR-005/012/014/015/018/019/022](../../ARCHITECTURE.md), [capability table](../agent-capabilities.md), [local verification kit limits](../verification/agent-skills-standard/README.md), canonical cyber-evidence/cyber-authorization and PRD source evidence. Prior receipt audit failed because tsx/node_modules were missing; it is not repeated or represented as passed here.

Run record: `artifacts/runs/mcp-security-assessment/d92d4c92-c706-401f-90f5-41865d78316c.json`.

Next workflow: implementation-readiness under the scoped human design approval above; no implementation or exercise authority implied. Complete actor tokens/prices remain unknown; session cost telemetry is consulted before handoff.
