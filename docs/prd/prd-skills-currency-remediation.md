# Delivery contract: skills currency remediation and dependency consolidation

## Authority and scope

Delivery mode: standard; SNC: S=2, N=0, C=2, total=4 (medium); work item: requester instruction to include skill changes in PR #347, consolidate dependency PRs #344, #345 and #346, resolve their failing pipelines, then close those superseded PRs. This extends the earlier audit-only authority; it does not rewrite the frozen audit or its independent-review receipt. Owner: requester. Execution: retain the selected Subagent-Driven approach, with independent parallel owners of disjoint source paths and an independent final review. Baseline: `2698e06d0dff6a6b25e7b54761e06ab728846124`.

Implement concrete P1/P2 recommendations in [the audit](../audits/skills-currency-audit.md), including selective version-gated references, compatibility preflight, category patch versions, reviewed freshness references, and generated exports. Retain existing consumer language floors, semantic JSON/draw.io ownership, raster-only offline HTML, CSP, logging/error-exposure contracts, and existing project module loaders. Do not adopt deferred branding, raw SVG, external fonts, a new renderer, preview-by-default APIs, or blanket runtime upgrades.

Consolidate exact reviewed Dependabot changes rather than merge their branches. PR #346 already includes the seven server updates proposed separately by #345: apply those once with a single workspace-lockfile owner. PR #344 updates pinned setup-uv from v7.6.0 to v10.4.0. Failed CI evidence establishes stale generated hook version markers (2.7.6 versus CLI 2.7.7) and #345's absent lockfile update. Fix the release-generation path so a future CLI version change does not repeat that drift; do not weaken hook equality tests or frozen-lockfile checks.

Repository edits, dependency installation needed for verification, commits/pushes to #347, and closure of the three superseded PRs after consolidation are authorized. Merge, package publication, release/tag creation, deployment, paid model evaluations, approval-policy changes and premium consultations are not authorized.

## Acceptance contract

| ID | Statement | Owners |
| --- | --- | --- |
| REQ-REM-01 | Skill correctness: each concrete audit correction is implemented in the existing skill/reference/eval family; obsolete contradictory guidance is removed. Optional newer features are explicitly gated and detailed in references. No new skill family is needed. Verified by AC-REM-01. | Tasks 1–3; coordinator static/eval and available consumer checks |
| AC-REM-01 | Satisfies REQ-REM-01: every audited correction is present, version-gated where optional, and no contradictory guidance remains. | Coordinator |
| REQ-REM-02 | Diagram contract: import omissions and source identities are accounted for; destination-readability checks are explicit; offline HTML exposes escaped semantic node/relationship text, including direction and group identity, without expanding active-content/network permissions. Existing image/editability contracts remain. Verified by AC-REM-02. | Task 4; coordinator export/browser lane |
| AC-REM-02 | Satisfies REQ-REM-02: export/browser proof shows the semantic transcript with escaped text and unchanged CSP/raster-only boundaries. | Coordinator |
| REQ-REM-03 | Dependency parity: all exact requested updates from #344–#346 are represented once; all workspace manifests and the single lockfile agree; the action commit pin corresponds to the requested release. No unrelated upgrades. Verified by AC-REM-03. | Tasks 5–6; coordinator package-install/CI lane |
| AC-REM-03 | Satisfies REQ-REM-03: frozen install, builds and audits pass under the requested versions without suppressed compiler errors. | Coordinator |
| REQ-REM-04 | Pipeline repair: canonical-generated hook bytes match and the release path keeps them synchronized on future version bumps; unchanged safety/quality gates remain enabled. Relevant CI failures must resolve, not be suppressed. Verified by AC-REM-04. | Task 6; coordinator release regression/CI lane |
| AC-REM-04 | Satisfies REQ-REM-04: hook parity tests and release regression pass; the original CI failure no longer reproduces. | Coordinator |
| REQ-REM-05 | Publication: changed category versions/dates, derived exports/indices and token metrics are synchronized; required maintenance checks, actual consumer discovery and independent review have recorded outcomes. No unrun check is called PASS. Verified by AC-REM-05. | Integration worker; coordinator generation/discovery lane |
| AC-REM-05 | Satisfies REQ-REM-05: generation drift checks pass and every unrun check is labelled NOT RUN. | Coordinator |
| REQ-REM-06 | PR lifecycle: #347 contains source changes and accurate verification evidence; #344, #345 and #346 are closed with replacement references only after their changes are included and verified. #347 is not merged. Verified by AC-REM-06. | Coordinator GitHub publication lane |
| AC-REM-06 | Satisfies REQ-REM-06: #347 evidence is accurate; the three superseded PRs are closed with links to #347; #347 remains unmerged. | Coordinator |

## Shared execution rules

Workers first read AGENTS.md, their generated assignment, and named standards (actual bodies). Edit existing files using the edit tool; use write only for new files. Shell commands use rtk. Snapshot each owned skill directory outside publishable source before editing. No worker delegates, commits, pushes, closes PRs, installs host tools, modifies another owner's paths, or changes release/security controls. Keep generated agent mirrors, metadata and changelog out of source-worker ownership.

Workers skip builds, lint, tests and formatters mid-flight. Freeze edits and return changed paths plus proposed focused checks; the coordinator runs focused and covering checks once after source owners settle. Existing CI failures are reproduction evidence, not reasons to rerun RED. Unobserved RED for new regression cases stays NOT RUN. A command/setup failure is not a behavioral failure. Later corrections invalidate only affected verification.

## Task 1: Go and shared error contracts

**Scope / owned write set:** `skills/golang/` and `skills/common/common-error-handling/` only.
**Inputs:** audit sections 2, 4 and 6; official sources linked there; current target rules/references/evals.
**Outputs:** context/caller-contract-aware wrapping; Is/As matching; Join with Go 1.20/nil/tree semantics; optional AsType gated at 1.26; effective-version-sensitive loop capture; typed-key/context logging examples; one log owner; aligned canonical client-envelope reference without changing consumer APIs.
**Real Ingress:** agent skill/reference load -> generated Go/backend advice -> existing caller/logging/client contract.
**Invariants:**
- Positive: preserve intentional error identity, boundary-safe translation, useful approved context and cancellation/nil semantics.
- Negative: no universal `%w`, equality, bare-return or logging-layer ban; no string matching, DB/secret leakage or unconditional version uplift.
**Gate / rollback:** none: repository guidance changes only; control: consumer compatibility and logging/exposure boundaries unchanged; rollback: revert; reversibility: revertible
**Verification owner:** coordinator; static review plus existing eval preflight/alignment and available behavior smoke for error/nil/identity and context semantics; compiler absence is explicit.
**Handoff / freeze:** return complete paths, changes mapped to the audit, proposed checks, risks and FINAL/frozen status; no edits after handoff absent corrective assignment.
**Correction route:** one bounded correction for concrete acceptance failures, then eligible delivery fallback or human decision for a material contract change.

## Task 2: JVM and native language correctness

**Scope / owned write set:** `skills/java/`, `skills/kotlin/`, `skills/swift/` only.
**Inputs:** audit sections 3–4 and 6 and linked official language/concurrency sources.
**Outputs:** Java stable virtual-thread versus exact-JDK preview separation, JDK-sensitive pinning, current LTS selection and triple-quote examples; Kotlin cancellation propagation and multiline syntax; Swift sendability and unstructured Task ownership; compact compatibility preflight and optional gated Kotlin 2.4 / Swift 6.4 references with matching eval corrections.
**Real Ingress:** language/concurrency/tooling guidance -> generated project code -> pinned compiler, language mode, SDK and runtime.
**Invariants:**
- Positive: correct cancellation/isolation and stable/preview contracts while retaining existing floors and public example intent.
- Negative: no forced toolchain upgrade, preview defaults, swallowed cancellation, implicit Task hierarchy or intrinsic struct thread-safety claim.
**Gate / rollback:** none: repository guidance changes only; control: project minima and preview opt-in unchanged; rollback: revert; reversibility: revertible
**Verification owner:** coordinator; eval preflight/alignment, source-based independent review and available compiler smoke, with unavailable matrices recorded.
**Handoff / freeze:** return audit mapping, paths, gates, proposed checks, risks and FINAL/frozen status.
**Correction route:** one concrete correction; unresolved material compiler/SDK decision returns to coordinator.

## Task 3: Web and scripting language correctness

**Scope / owned write set:** `skills/javascript/`, `skills/typescript/`, `skills/python/`, `skills/php/`, `skills/dart/` only.
**Inputs:** audit sections 3–4 and 6 and linked primary sources.
**Outputs:** JS loader preservation and selective promisification; TS compiler/runtime/tool-peer preflight and satisfies minimum; Python annotation-version and explicit encoding guidance; valid PHP intersection example and precise feature/readonly minima; Dart production-safe nullability and modern required diagnostics; optional language-3.13 primary-constructor reference. Reconcile affected examples/evals, not just prose.
**Real Ingress:** skill load -> emitted module/type/constructor/file-boundary code -> existing project consumer.
**Invariants:**
- Positive: preserve loaders, encoding, type/cancellation/nullability contracts and declared language minima.
- Negative: no ESM migration for existing CJS, blanket promisify, debug assertion as production proof, scalar intersections or unverified newer-syntax default.
**Gate / rollback:** none: repository guidance changes only; control: existing consumer compatibility unchanged; rollback: revert; reversibility: revertible
**Verification owner:** coordinator; static/eval checks plus available Node/Python/PHP/Dart/TS consumer smoke; no unavailable compiler is called verified.
**Handoff / freeze:** return per-language audit mapping, changed files, proposed checks, risks and FINAL/frozen status.
**Correction route:** one bounded correction; unresolved consumer API/toolchain decision returns to coordinator.

## Task 4: Diagram fidelity and accessible offline export

**Scope / owned write set:** `skills/common/common-architecture-diagramming/` only.
**Inputs:** audit section 5; existing export/schema/parser tests and extraction/readability/offline-export references.
**Outputs:** explicit source/page/identity/omission accounting and destination-readability checklist; semantic node/relationship transcript derived from canonical JSON and HTML-escaped in the existing offline package, including grouping and edge direction; regression cases for hostile labels and meaningful relationship semantics.
**Real Ingress:** valid canonical spec -> current export_html.py CLI -> self-contained light/dark raster package consumed in browser, with semantic content readable when images are disabled.
**Invariants:**
- Positive: preserve IDs, labels, groups and source/target direction; expose unsupported or omitted imported semantics as unresolved.
- Negative: no new renderer/dependencies, raw SVG, active markup from labels, network/font retrieval, changed CSP or silent semantic pruning.
**Gate / rollback:** none: additive semantic text within existing exporter; control: raster-only offline and editable-source boundary unchanged; rollback: revert; reversibility: revertible
**Verification owner:** coordinator; existing stdlib Python suite, real render/export CLI and browser/accessibility/narrow-view proof including literal hostile text; independent security-focused static review.
**Handoff / freeze:** return tests and exact producer/consumer commands, changed paths and FINAL/frozen status; no source writes during coordinator smoke.
**Correction route:** one concrete correction; any proposed export-trust-boundary expansion requires a user decision, not a workaround.

## Task 5: Consolidate dependency PRs 346 and 345

**Scope / owned write set:** `package.json`, `cli/package.json`, `mcp/package.json`, `server/package.json`, `website/package.json`, `pnpm-lock.yaml` only.
**Inputs:** exact diffs from PR #346 at `4c849a85dafbf7d1f0d5bd499dc27242e5d9304b` and #345 at `a3a2195a8c26b5ce9a23fbec1fd29f2938f8d3c3`; single workspace pnpm configuration; failed frozen-lockfile log.
**Outputs:** exact requested manifest bumps and consistent lockfile; dependencies installed for coordinator verification. Treat #345's seven updates as the duplicate subset of #346, not a second lockfile author.
**Real Ingress:** workspace package manifests and lockfile -> pnpm frozen install -> CLI/MCP/server/website builds/tests.
**Invariants:**
- Positive: requested package versions appear consistently in all affected workspace importers.
- Negative: no unrelated version upgrades, frozen-install weakening, security override removal, public package version/release bump or quality-gate suppression.
**Gate / rollback:** none: development branch dependency consolidation; control: lockfile integrity and existing support floors retained; rollback: revert; reversibility: revertible
**Verification owner:** coordinator; frozen installation, applicable builds/tests, dependency audit and exact requested-version comparison.
**Handoff / freeze:** report exact manifest mapping, lockfile provenance, install result, skipped optional native builds, paths and FINAL/frozen status. Report missing dependency/registry access, never fabricate installed tooling.
**Correction route:** one bounded compatibility correction; unavailable package/access returns to coordinator without silently substituting versions.

## Task 6: setup-uv and version-bump pipeline repair

**Scope / owned write set:** `.github/workflows/skillevaluator.yml`, `scripts/release-cli.ts`, `scripts/release/`, `.claude/hooks/preedit-skill-loader.js`, `.github/hooks/preedit-skill-loader.js`, `.codex/hooks/preedit-skill-loader.js`. Request extra owned paths only if evidence proves necessary.
**Inputs:** exact #344 diff at `036daa487387c40268d7c4c075b36da7d413c3b6`; failed HookService equality tests; canonical embedded template in `cli/src/services/HookService.ts`; current release/generation machinery.
**Outputs:** pinned setup-uv v10.4.0 update; generated hooks synchronized using the canonical template and existing release generation; permanent release-path fix with a regression proving a simulated version bump updates installed hook bytes. Do not perform a real release.
**Real Ingress:** CLI version bump/release preparation -> generated hook copies -> installed loader/version detection and existing equality tests.
**Invariants:**
- Positive: all three generated copies remain byte-identical to the canonical current-version template, including on future prepared bumps.
- Negative: no manual marker-only workaround, fixture re-pinning instead of producer repair, altered hook enforcement semantics, approval-control changes, test weakening, real tag/publish or evaluator/model invocation.
**Gate / rollback:** none: repository preparation path only; control: security behavior and manual-only evaluator activation unchanged; rollback: revert; reversibility: revertible
**Verification owner:** coordinator; existing HookService tests, focused release regression, static action-pin/migration review and CI after publication.
**Handoff / freeze:** report reproduction basis, producer fix, requested action pin, exact changed files, proposed checks, risks and FINAL/frozen status.
**Correction route:** one concrete correction; changes to authorization/release effects need coordinator/user review before editing.

## Integration and final verification

A separate integration owner runs after Tasks 1–6 freeze. It owns `skills/metadata.json`, generated native skill resources/indices/catalogs, derived token metrics, changelog and this delivery evidence only. It bumps changed categories once, records genuinely reviewed upstream references without turning pins into consumer minima, and uses repository generators rather than hand-editing mirrors. It must preserve user-installed/customized host artifacts and fail closed on foreign-CWD or unowned conflicts.

The coordinator executes applicable focused tests, maintenance gates (`validate:all`, `audit:sdlc`, `audit:skills`, `check-alignment`, generation drift, token drift and consumer discovery), dependency/package builds/tests and browser proof once writers settle. A distinct Personal Analysis & Review session reviews the cumulative branch and each task's acceptance criteria; security/input and compatibility boundaries are explicit. Current CI outcomes are recorded without treating source review as behavior proof. Close each superseded PR with a link to #347 only after its exact changes are demonstrably consolidated. Keep source-remediation evidence separate from the historical audit's static verdict.
