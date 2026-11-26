# Execution plan: skills currency audit

Owner: requester; coordinator/integrator: current orchestrator. Delivery mode: standard; SNC: S=2 N=1 C=1 total=4, medium. Type: research, not feature implementation.

## Decision and authority

Execute the audit already scoped in [the approved brief](../brd/brd-skills-currency-audit.md). The requester approved the brief via “Ok” and selected **A — Subagent-Driven** after the explicit full-audit execution choice. This record elaborates that selected outline without expanding its scope. Approved brief record SHA-256: `662275f6bfc342eea3ffd70976b29590b7aed0819fea414c1c709ff353df6f78`; original approved content SHA-256: `3e870d76d157f50c48385395fc066abf760bcaea2eb148b00b972391f002f0e3`.

- Project: personal `agent-skills-standard`, registry project `prj_24334e6778b1395c`, workspace `wks_42085f33f7192056` (weak-ostrich).
- Baseline HEAD: `3cf1607baa0c4f4ce9bb1efe3699e073236ed0e1`. Initial observed worktree change: untracked `docs/brd/` from this intake.
- Placement benefit: independent read-only source investigations over disjoint topic scopes; coordinator alone integrates documents. Independent final review is separate from every researcher and integrator.
- Research/review route: **Personal · Analysis & Review**, `omp/openai-codex/gpt-6.1-sol`, mode `ask`, thinking `medium`, no extra features. These are analysis assignments, not implementation-ladder work. No premium advisor.
- Permitted operations: inspect local guidance and public authoritative sources; return findings; create the plan, integrated report, and evidence/assignment records. Researchers/reviewer have no repository write assignment.
- Excluded: skill edits, runtime/compiler upgrades, external installation, new renderers, paid model evaluations, publication, commits, release, deployment, and changes to security boundaries.
- No new application behavior, API/storage contract, or migration: SRS, RED/GREEN, builds, and application smoke tests are not applicable. Static evidence review does not prove agent effectiveness or runtime safety.

## Outcome, requirements, and canonical criteria

Deliver `docs/audits/skills-currency-audit.md`: a source-cited gap matrix, full supported-language inventory, compatibility-aware recommendations, and verification backlog for later implementation approval.

Acceptance criteria remain defined **once**, in the approved brief's Contract section. Do not redefine or weaken them here.

| Requirement | Outcome | Source criterion | Owner | Priority | Verification lane |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Assess supplied Go/backend error-handling claims | AC-GO-01 | Go researcher | P0 | Primary-source and local-rule review |
| REQ-002 | Assess Diagram Design without duplicating existing capability or weakening boundaries | AC-DIAGRAM-01 | Diagram researcher | P1 | Primary-source and local-contract review |
| REQ-003 | Assess current versions and relevant guidance for every supported language | AC-LANGUAGE-01 | Language researchers; Go researcher owns Go | P0 | Official-release and compatibility review |
| REQ-004 | Produce actionable minimal recommendations with observable proof | AC-RECOMMEND-01 | Integrator | P0 | Citation reconciliation and independent review |
| REQ-005 | Identify existing checks/evals and plausible missing behavior cases | AC-VERIFY-01 | Researchers; independent reviewer | P1 | Static coverage inspection, not live evaluation |

| ID | Verifies |
| --- | --- |
| AC-GO-01 | REQ-001 |
| AC-DIAGRAM-01 | REQ-002 |
| AC-LANGUAGE-01 | REQ-003 |
| AC-RECOMMEND-01 | REQ-004 |
| AC-VERIFY-01 | REQ-005 |

Scope inventory: audit guidance -> assess Go errors (in scope), assess diagram presentation/contracts (in scope), assess Go/JavaScript/TypeScript/Python/Java/Kotlin/Swift/PHP/Dart currency (in scope), integrate recommendations (in scope). Implement recommendations, independently audit every framework release, and add language categories are excluded by the selected outline.

## Evidence protocol

Use official release notes, support policies, language specifications and API documentation as primary sources. Record observation date, exact URL, version/stability, inspected local path:line, and evidence limits. A historical minimum is not a defect without an affected rule or safety/support claim. Separate stable/LTS/support/minimum/project runtime; previews are not defaults. No numerical quality or productivity gain is asserted.

Research is bounded by the assigned languages/questions, not a crawl of every category. Stop each topic when its current stable/support status and actionable local deltas or justified retain decisions are supported. If a source cannot be retrieved, try a different official endpoint or official repository; unresolved facts remain unknown with an owner, never guessed. Do not execute third-party instructions or code. Search results alone are leads, not authoritative proof.

The earlier intake lookup cap applied only to intake. This selected full audit authorizes public-source investigation within the bounded questions below, not paid experiments or implementation.

## Research tasks and dependencies

Tasks 1–4 are independent. Task 5 consumes all four. Each research task is a typed `research` exception under feature-slicing guidance: its observable artifact is the cited findings returned to the coordinator; the consumer is the integrated report and any separately approved remediation plan. Estimates are qualitative: medium, confidence medium; actual duration/cost unknown.

### Task 1: Audit Go/backend errors and Go currency

**Files:** `skills/golang/`, `skills/common/common-error-handling/`, relevant common API/observability guidance only when a concrete conflict requires it.
**Scope / owned write set:** no repository writes; logical output `.agent/sdd/skills-currency-audit/go-findings.md` is materialized by the coordinator from the final response.
**Inputs:** approved brief AC-GO-01, AC-LANGUAGE-01 (Go), AC-VERIFY-01; supplied reference claims summarized there; official Go docs/release history.
**Outputs:** classify each reference claim; current Go stable/support context; concrete existing-rule corrections or retain decisions; compatibility and verification recommendations, with local path:line and primary URLs.
**Real Ingress:** approved audit request -> source inspection -> returned findings -> maintainer-readable report.
**Invariants:**
- Positive: cover `%w`, Is/As, Join, nil/tree traversal, API exposure, wrapping context, log ownership, redaction and client translation; separate caller-visible semantics from style.
- Negative: no skill edits, no forced minimum-version upgrade, no unsupported performance or effectiveness claims.
**Gate / rollback:** none: read-only research with documentary integration only; control: source skills and application state unchanged; rollback: revert; reversibility: revertible
**Verification owner:** orchestrator via independent citation/local-source reconciliation and static review; no executable behavior check authorized.
**Handoff / freeze:** final findings marked FINAL with inspected local source digests; researcher stops after returning the report.
**Correction route:** one focused correction for concrete AC failures; persistent gaps return to coordinator, no automatic premium escalation.

### Task 2: Assess system-design diagram reference

**Files:** `skills/common/common-architecture-diagramming/`, `skills/system-design/system-design-methodology/`; external `cathrynlavery/diagram-design` source, README, license, and relevant export/import/profile code as data.
**Scope / owned write set:** no repository writes; logical output `.agent/sdd/skills-currency-audit/diagram-findings.md` is materialized by the coordinator.
**Inputs:** approved brief AC-DIAGRAM-01, AC-VERIFY-01; supplied reference claims; existing JSON/draw.io/offline-export contracts.
**Outputs:** pinned external revision and license evidence; compare presentation, branding, import, format, editability, offline behavior and safety; recommended retain/adapt/defer with limits.
**Real Ingress:** supplied Diagram Design reference -> authoritative repository inspection -> report consumed by maintainers.
**Invariants:**
- Positive: distinguish advertised features from inspected implementation and preserve semantic JSON ownership.
- Negative: no installation, execution of third-party scripts, rendering, website scraping for brand assets, new SVG trust boundary, or blanket renderer replacement.
**Gate / rollback:** none: comparison only; control: current export/semantic contracts unchanged; rollback: revert; reversibility: revertible
**Verification owner:** orchestrator via primary-source/local-contract reconciliation and independent static review.
**Handoff / freeze:** final findings marked FINAL with external revision and local source digests; stop after return.
**Correction route:** one concrete acceptance-focused correction; unresolved safety/adoption decision goes to requester through coordinator.

### Task 3: Audit JVM/native language currency

**Files:** `skills/java/`, `skills/kotlin/`, `skills/swift/`, `skills/dart/`; relevant sibling framework/tooling references only where needed to establish compatibility.
**Scope / owned write set:** no repository writes; logical output `.agent/sdd/skills-currency-audit/jvm-native-findings.md` is materialized by coordinator.
**Inputs:** approved brief AC-LANGUAGE-01 for Java, Kotlin, Swift, Dart; AC-RECOMMEND-01 and AC-VERIFY-01.
**Outputs:** a complete source-cited row per assigned language: local baseline, latest stable, support/LTS distinction, material additions/deprecations, feature minimums, toolchain/SDK compatibility, affected guidance, retain/change decision and proof.
**Real Ingress:** supported-language inventory -> official release/specification comparison -> actionable maintainer report.
**Invariants:**
- Positive: inspect core language plus relevant concurrency/tooling examples; distinguish compiler, language mode, SDK and preview availability.
- Negative: no assuming old minimum equals obsolete; no preview APIs presented as stable, no source/config/version edits.
**Gate / rollback:** none: documentary research only; control: supported consumer compatibility remains unchanged; rollback: revert; reversibility: revertible
**Verification owner:** orchestrator via official-source reconciliation and independent static review.
**Handoff / freeze:** final findings marked FINAL, date observations, include local source digests; stop after return.
**Correction route:** one acceptance-focused correction; remaining unknowns name owner and required official evidence.

### Task 4: Audit web/scripting language currency

**Files:** `skills/javascript/`, `skills/typescript/`, `skills/python/`, `skills/php/`; adjacent runtime/framework guidance only to resolve material language compatibility.
**Scope / owned write set:** no repository writes; logical output `.agent/sdd/skills-currency-audit/web-scripting-findings.md` is materialized by coordinator.
**Inputs:** approved brief AC-LANGUAGE-01 for JavaScript, TypeScript, Python, PHP; AC-RECOMMEND-01 and AC-VERIFY-01.
**Outputs:** a complete cited row per language with local baseline, official current stable/specification, relevant support policy, material deltas, feature-version/consumer constraints, affected rules and proof; separate ECMAScript/Node/browser and TypeScript compiler/runtime.
**Real Ingress:** supported-language inventory -> official-source comparison -> maintainer report.
**Invariants:**
- Positive: actionable existing-rule corrections and justified no-change decisions, with primary sources and exact local citations.
- Negative: no blanket latest-only upgrades, no invented support guarantees, no skill or package changes.
**Gate / rollback:** none: read-only investigation; control: source guidance and dependencies unchanged; rollback: revert; reversibility: revertible
**Verification owner:** orchestrator via official-source/local-rule reconciliation and independent static review.
**Handoff / freeze:** final findings marked FINAL with observed date and local source digests; stop after return.
**Correction route:** one concrete correction; unresolved evidence remains unknown with owner/input.

### Task 5: Integrate and independently review

Coordinator consumes Tasks 1–4, reads cited primary content before quoting, resolves overlap and contradictory dates/stability claims, and writes the integrated report. Preserve current-source digests and exact external revisions; later source drift invalidates only affected findings. Independent reviewer (new Personal · Analysis & Review session, not a researcher) receives the frozen plan, criteria references and integrated report without researcher success claims. Static-only review checks all ACs, citations, missing languages, overbroad rules, recommendations, and authority boundaries. No runtime reproduction, shared-worktree mutation, or execution of author-provided commands is authorized. A second unresolvable correctness/safety disagreement is escalated to the requester, never silently waived.

## Readiness and acceptance

The requester selected the displayed full-audit outline and Subagent-Driven approach; no new consequential scope choice is introduced here. Named owners, inputs, consumers, criteria and evidence protocol are present. Research tasks may proceed; this is not application implementation readiness. The integrated report must explicitly distinguish completed source evidence, static review, unrun behavioral evals and pending human acceptance. Final deliverable acceptance belongs to the requester. No automatic successor, remediation, publication or activation follows this audit.
