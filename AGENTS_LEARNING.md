# Agent Learning Log

This file is auto-maintained by AI agents as a self-improving mistake log.
Each iteration captures a concrete mistake, the pattern to avoid, and the better approach.
Do not edit past entries; append only.

---

## Agent Learning Log: Iteration #1

**Date**: 2026-05-08 | **Task**: Consolidate Antigravity folders and fix sync issues.
**Signal**: User correction

### ❌ Mistake Made
- Refactored `.antigravity/mcp_config.json` to `.agents/mcp_config.json` without confirming if the original path was a requirement for the Antigravity agent.
- Implemented a destructive cleanup of the `.agent` folder using `fs.remove` without migrating existing user content (custom skills) first.

### 🚫 Pattern to Avoid
- **No arbitrary path consolidation**: Do not change agent-specific configuration paths based on naming "consistency" assumptions without verifying requirements.
- **No destructive cleanup without migration**: Never delete folders that could contain unique user-created content (e.g., custom skills) without a merge/migration step.

### ✅ Better Approach
Verify agent configuration paths against documentation or current user state before refactoring. Implement a "Migrate and Clean" protocol: check for source existence, merge non-duplicate items to the destination, and only then perform the deletion.

---

## Agent Learning Log: Iteration #2

**Date**: 2026-07-12 | **Task**: Improve live skill evaluation quality.
**Signal**: User correction

### ❌ Mistake Made
I reported evaluator safety and incremental-run improvements without making the remaining skills-improvement work equally explicit. That risked treating measurement infrastructure as completion while the report still showed below-gate skills.

### 🚫 Pattern to Avoid
- **No infrastructure-as-outcome reporting**: A safer runner does not prove that skill bodies, activation boundaries, or live outcomes meet the stated quality gate.

### ✅ Better Approach
Track source repair, fresh evidence, and category promotion as separate deliverables. Report the remaining below-gate skills and continue the remediation waves until current evidence proves the release gate.

---

## Agent Learning Log: Iteration #3

**Date**: 2026-07-13 | **Task**: Verify the skill-remediation eval runs.
**Signal**: User correction

### ❌ Mistake Made
I repeatedly asked for a run after the user had already completed `all-v2.6.0-2026-07-12T15-40-45-083Z-1d558d66`. I inspected incomplete prepared manifests before checking the newest completed `results.json`, then continued changing sources after the completed run without clearly freezing the verification batch.

### 🚫 Pattern to Avoid
- **No run-state assumptions**: Never ask for execution, quota approval, or reruns before enumerating and verifying the newest completed eval run.
- **No moving verification target**: Freeze a remediation batch before a user runs it; do not silently add more source changes and then describe a new run as the same required step.

### ✅ Better Approach
At each user update, inspect `manifest.json`, `results.json`, and `completedAt` first. Treat the latest completed run as authoritative, finish analysis against that immutable evidence, and present any later verification as a separately named, one-time frozen batch with its exact scope.

---

## Agent Learning Log: Iteration #4

**Date**: 2026-10-01 | **Task**: Correct skill release version bumps.
**Signal**: User correction

### ❌ Mistake Made
I used minor version bumps for small additive workflow and skill guidance changes without matching the requested release scale.

### 🚫 Pattern to Avoid
- **No scope inflation in semantic versioning**: A small, backward-compatible guidance change does not automatically justify a minor bump.

### ✅ Better Approach
Classify the user-visible change by its actual impact and follow repository release conventions; use patch bumps for small compatible corrections, and align category/workflow metadata with the changelog.

---

## Agent Learning Log: Iteration #5

**Date**: 2026-10-06 | **Task**: Resolve the bounded-worker deployment prerequisite.
**Signal**: Session retrospective
**Skills**: common/common-decision-discipline, common/common-session-retrospective
**Scope**: project
**Candidate**: bcd-runtime-prerequisite-communication | **Status**: proposed
**Provenance**: BASE `1fb0537c339c1e135167f4c15ba603b8849da5bc`; deployment-choice exchange and `docs/srs/srs-provisioning-recommendation-bounded-context-delegation.md`.
**Evaluation**: not-run
**Review**: pending; no registry-maintenance or promotion authorization
**Rollback**: not-applicable; proposal only

### Mistake Made
I repeatedly requested an Apple-entitled executable or alternative containment owner before presenting a plain-language provisioning recommendation. The user asked “what you need?” and selected “Unsure / neither available”; generic continuation replies could not resolve the technical prerequisite.

### Pattern to Avoid
- **No operator implementation quiz**: A missing deployment environment requires an evidence-backed recommendation and a bounded owner decision, not repeated requests for technical artifacts the owner may not possess.
- **No ambiguous approval escalation**: A general “yes” does not authorize a new signed runtime, installation, account change or deployment.

### Better Approach
Explain the missing guarantee, present the smallest supported candidate with explicit unknowns, and distinguish recommendation approval from exact provisioning/qualification authority. Propose extending the existing decision-discipline examples with this scenario; preserve the security gate, and evaluate/review the proposal before any canonical skill change.

### Trigger Miss
```json
{"skill":"common/common-decision-discipline","indirect_phrase":"what you need?","root_cause":"routing","source_revision":"1fb0537c339c1e135167f4c15ba603b8849da5bc","proposed_change":"Add a missing-environment prerequisite example that routes to an operator-answerable recommendation before requesting deployment artifacts.","status":"proposed"}
```

---

## Agent Learning Log: Iteration #6

**Date**: 2026-10-06 | **Task**: Open the ready AGS fixes PR.
**Signal**: User correction
**Skills**: common/common-decision-discipline, common/common-session-retrospective
**Scope**: project
**Candidate**: ags-publication-versus-activation-scope | **Status**: proposed
**Provenance**: source revision `a9f7ba3bc1bbefceaf847334d9cce240261abd61`; user “i thought you just need to raise the PR” followed by explicit “Ready AGS fixes PR”; scoped PR #224 and local progress ledger.
**Evaluation**: not-run
**Review**: pending; PR code review is not approval of this procedure proposal
**Rollback**: not-applicable; proposal only, excluded from PR

### Mistake Made
I treated runtime qualification and VM provisioning as prerequisites for opening an AGS repository fixes PR. The user wanted publication; the broader runtime remained a separate unfinished deliverable.

### Pattern to Avoid
- **No activation-as-publication prerequisite**: Host deployment gates apply to activation, not an independently verifiable repository fixes PR.
- **No unrequested delivery expansion**: Blockers outside the selected deliverable must not redirect publication into environment procurement.

### Better Approach
Freeze the user-selected PR scope, prove its behavior and exact commit identity, then commit/push/open against the repository's actual default branch. Preserve excluded planning and runtime evidence locally; report incomplete activation separately. Propose a publication-versus-activation example in existing decision-discipline guidance; no canonical AGENTS.md, skill or approval-control changes without authorized evaluation and independent maintainer review.

### Trigger Miss
None established: applicable guidance was loaded; this was a workflow/scope application error, not a missing keyword alias.

---

## Agent Learning Log: Iteration #7

**Date**: 2026-10-07 | **Task**: Audit coordinator cost, context replay and delivery friction.
**Signal**: User correction
**Skills**: common/common-context-optimization, common/common-session-retrospective
**Scope**: project
**Candidate**: ags-bounded-coordinator-context | **Status**: proposed
**Provenance**: source revision `a9f7ba3bc1bbefceaf847334d9cce240261abd61`; `artifacts/runs/ags-session-retrospective/20261007T013618Z-metrics.json` and linked retrospective report. Historical cutoff excludes retrospective usage.
**Evaluation**: not-run; historical accounting reconciled independently, no candidate/no-skill comparison
**Review**: pending; no maintainer promotion authorization
**Rollback**: not-applicable; canonical guidance/runtime settings unchanged

### Mistake Made
I delegated coding to Luna but retained hundreds of coordinator steps, detailed source/review material and repeated gates on Sol. Recorded coordinator cost was 60.0% of observed session estimates despite 96.1% cache-read input: high cache hit rate did not make the large repeated context economical.

### Pattern to Avoid
- **No worker-only savings claim**: Measure coordinator, reviewer, retry and auxiliary usage together.
- **No cache-hit-as-efficiency proxy**: Track replay volume, context size, output and phase costs as well as hit rate.

### Better Approach
Use bounded phase packets, complete slice ownership, concise revision-bound receipts and deterministic check collection. Preserve required safety/independent review; rerun only evidence invalidated by the actual change. Extend existing context/implementation guidance through the report's held-out evaluations before promotion; permission/profile fixes belong to their host/account owners.

### Trigger Miss
```json
{"skill":"common/common-context-optimization","indirect_phrase":"caching, context management, main-model cost","root_cause":"routing","source_revision":"a9f7ba3bc1bbefceaf847334d9cce240261abd61","proposed_change":"Add prompt-cache and orchestration-cost activation cases while retaining framework-context negative cases; reconcile history masking with append-only caching.","status":"proposed"}
```

---

## Agent Learning Log: Iteration #8

**Date**: 2026-10-08 | **Task**: Correct W3 guidance after independent acceptance review
**Signal**: User correction
**Skills**: system-design/system-design-methodology, system-design/system-design-review, common/common-learning-log
**Scope**: project
**Candidate**: ags-w3-dependency-and-eval-clean-cutover | **Status**: proposed
**Provenance**: source revision `47104bdc08537d68f60f6a4d3bf60e8b071166bb`; `.superpowers/sdd/ags-sdlc-implementation/task-review.md` findings I1–I4 and D1–D6 artifacts
**Evaluation**: pending bounded post-correction checks and controller-owned re-exercise
**Review**: pending; correction author does not self-approve
**Rollback**: source version remains system-design `1.2.2` until correction metadata patch is committed

### Mistake Made
The W3 edits changed the headline skills but left linked guidance and scorecard anchors that contradicted risk-driven deep dives, conditional redraw, and lifecycle-qualified scoring. Several replacement eval assertions also prescribed a specific risk label, readiness status for sparse input, or optional async choice instead of the invariant.

### Pattern to Avoid
- **No entrypoint-only cutover**: A changed primary skill is not complete while a required linked reference still imposes the removed behavior.
- **No lexical replacement contract**: Evaluation assertions must not turn acceptable labels or optional architecture choices into mandatory outputs.

### Better Approach
Trace every changed consumer through its required references, sibling skills, output templates, and scorecard before freezing. Align evidence anchors to declared lifecycle, keep production evidence mandatory only for operations claims, and assert behavioral invariants without prescribing names or optional mechanisms.

---

## Agent Learning Log: Iteration #9

**Date**: 2026-10-08 | **Task**: Correct AGS accounting delta and native provenance behavior.
**Signal**: Session retrospective
**Skills**: implement-feature, typescript/typescript-language, common/common-tdd, common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: ags-per-journal-native-identity-redaction | **Status**: proposed
**Provenance**: source revision `1276a9a6f19e7eb0c6bef242ca9ca391eca3673d`; `.superpowers/sdd/ags-accounting-implementation/tmp-evidence/correction-follow-up-final/verification.md`.
**Evaluation**: not-run
**Review**: pending; no guidance-maintenance or promotion authorization
**Rollback**: not-applicable; proposal only

### Mistake Made
I initially retained a separate capped native-identity map for every selected OMP journal until final report grouping. The 10,000-ID per-journal limit did not bound aggregate retained identity state as selected-journal count grew. The active-session compliance audit also showed that repository skills had not been loaded before continuing source edits from carried-over context.

### Pattern to Avoid
- **No per-item cap mistaken for a total-state bound**: A capped map per item can still grow with the number of selected items.
- **No carried-over skill-load assumptions**: Prior-session summaries do not establish current-session MCP compliance.

### Better Approach
At each selected-journal boundary, redact/re-key accumulated groups while only the current journal's capped identity map is live, then clear its signature values; keep cross-journal collision regressions. At session start, load the workflow and file-matched skills in the active MCP session before editing; verify with the compliance audit before handoff.

### Trigger Miss
None established: matching project skills were available and loaded once the audit gap was detected; the failure was procedure/timing, not a missing trigger alias.

---

## Agent Learning Log: Iteration #10

**Date**: 2026-10-08 | **Task**: Isolate scripts-disabled MCP package installation.
**Signal**: User correction
**Skills**: common/common-learning-log, common/common-session-retrospective
**Scope**: project
**Candidate**: ags-explicit-prefix-install-isolation | **Status**: proposed
**Provenance**: source revision `e26f7831df558a9d2918a0ac29d2290ac91fbede`; `.superpowers/sdd/ags-accounting-implementation/task-implementation-invariants.md`.
**Evaluation**: not-run
**Review**: pending; no guidance-maintenance or promotion authorization
**Rollback**: not-applicable; proposal only

### Mistake Made
I ran the scripts-disabled npm install from an isolated subdirectory without an explicit prefix. npm resolved the repository root package context and failed in Arborist; although no root files changed, the command did not enforce the requested install boundary.

### Pattern to Avoid
- **No cwd-only install isolation**: A nested current directory does not guarantee npm will confine dependency and lockfile writes there.

### Better Approach
Pass `--prefix <absolute-isolated-install-directory>` on package installation, keep `--ignore-scripts`, and verify the installed executable from that exact prefix before reporting the package smoke.

---

## Agent Learning Log: Iteration #11

**Date**: 2026-10-11 | **Task**: Make the cross-project harness pilot independent of AGS installation.
**Signal**: Session retrospective
**Skills**: common/common-decision-discipline, common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: ags-optional-adapter-planning | **Status**: proposed
**Provenance**: source revision `b529c2d99112db2af63aa2c32365a37759613cc6`; owner clarification about projects without AGS; `docs/prd/prd-cross-project-harness-pilot.md` optional-AGS paths and linked delegation plan.
**Evaluation**: not-run; structural document checks are not a portability delivery evaluation
**Review**: pending; no canonical guidance-maintenance or promotion authorization
**Rollback**: not-applicable; proposal only

### Mistake Made
The first cross-project pilot plan required `AGENTS.md` and MCP skill lookup in every worker prompt, although the requested reuse included projects without AGS. Local AGS/Paseo/accounting capabilities became implicit universal prerequisites.

### Pattern to Avoid
- **No local adapter as universal prerequisite**: Missing AGS/MCP does not imply missing project standards, independent review, or behavioral verification.
- **No untested portability claim**: Supporting an alternative in a brief is not evidence that a real non-AGS project completed delivery.

### Better Approach
Separate invariant delivery obligations from optional standards/runtime/coordination/measurement adapters. Enroll the actual project, select its authoritative guidance and available checks, and keep absent telemetry unknown. Evaluate the proposed decision-discipline example on AGS/MCP, installed-files-only, and non-AGS cases before any registry promotion.

### Trigger Miss
None established: decision guidance was loaded; the error was applying current-workspace assumptions to cross-project scope.

---

## Agent Learning Log: Iteration #12

**Date**: 2026-10-11 | **Task**: Close the owner-approved Personal harness pilot pair.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: cross-worktree-brief-absolute-artifact-paths | **Status**: proposed
**Provenance**: source revision `b529c2d99112db2af63aa2c32365a37759613cc6`; `.agent/sdd/2026-10-11-cross-project-harness-pilot/p-treat-delivery-brief.md`, delivery-report consultation gap, and independent-review retained concerns.
**Evaluation**: not-run; one repaired consultation/reference is not a held-out guidance evaluation
**Review**: pending; card implementation review does not approve a shared-guidance proposal
**Rollback**: not-applicable; proposal only, no instruction/registry/control promotion

### Mistake Made
I abbreviated the cross-worktree published card reference as “parent task-cards.md” while separately authorizing a parent ledger. The treatment worker looked for the card in that ledger and failed to consult the published card; the full bounded brief and treatment contract/checklist still supplied its execution requirements. The later reviewer consulted the exact published path; this does not erase the worker's failed lookup.

### Pattern to Avoid
- **No ambiguous external artifact roots**: A fresh worktree does not contain the parent's uncommitted planning artifacts, and “parent” can refer to several directories.
- **No later success as historical compliance**: Supplemental current-source proof does not manufacture prior consultation or exit-status receipts.

### Better Approach
Give every cross-worktree input its exact absolute path, allowed section and owning directory. Supply complete bounded requirements without assuming draft artifacts exist in the new checkout. Preserve failed consultation/unknown receipts, and corroborate final consumer behavior separately when reachable. For strict context isolation, use raw bounded reads: structured range reads were observed to add out-of-scope baseline snippets. This is a proposed procedure improvement, not a verified sandbox or promoted rule.

### Trigger Miss
None established: applicable workflow/file standards were loaded; the concrete failure was brief-path procedure, with a separate tool/adapter range-exposure defect reported for review.

---

## Agent Learning Log: Iteration #13

**Date**: 2026-10-11 | **Task**: Classify second-project discovery boundaries.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: session
**Candidate**: control-claims-require-action-observation-proof | **Status**: proposed
**Provenance**: parent plan revision `b529c2d99112db2af63aa2c32365a37759613cc6`; sanitized readiness record `artifacts/runs/cross-project-harness-pilot/20261011T145308Z-implementation-readiness.json`, guidance correction.
**Evaluation**: not-run; no denial/write/egress exercise authorized
**Review**: pending; corrected analysis is not shared-guidance approval
**Rollback**: not-applicable; proposal only

### Mistake Made
Delegated guidance analysis classified documented hook presence and successful allowed metadata commands as active enforcement, and tool availability as proof of absent OS write protection. One bounded follow-up corrected those claims without generating unauthorized control probes.

### Pattern to Avoid
- **No declaration as observed control**: Source/configuration or successful allowed actions do not prove blocking behavior.
- **No tool presence as absent protection**: Advertised write tools do not establish actual filesystem enforcement either way.

### Better Approach
Separate instructions, approval metadata, documented mechanisms and action-observation enforcement receipts. If no authorized denial/protection exercise exists, leave enforcement unknown/unverified. Keep any host-redesign proposal distinct from binding task requirements and approval.

### Trigger Miss
None established: this was evidence-classification procedure, not proof of missing control tooling.

---

## Agent Learning Log: Iteration #14

**Date**: 2026-10-11 | **Task**: Bound candidate discovery and its guidance claims.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: session
**Candidate**: candidate-screening-before-slot-filling | **Status**: proposed
**Provenance**: parent plan revision `b529c2d99112db2af63aa2c32365a37759613cc6`; same sanitized readiness record, candidate correction.
**Evaluation**: not-run; no code, runtime or guidance promotion authorized
**Review**: pending; no canonical maintenance approval
**Rollback**: not-applicable; proposal only

### Mistake Made
Candidate analysis initially treated an active filtering hook as safe ordinary tooling, relied on conceptual guidance instead of actual file routing, and overstated setup/authorization/billing certainty. One corrective follow-up excluded the protected candidate, performed file-matched lookups and returned one genuine candidate rather than manufacturing two.

### Pattern to Avoid
- **No harmless label overriding exclusions**: A developer utility may still be an active control/routing surface.
- **No concept lookup as file-match compliance**: Delivered framework/testing bodies may omit rules for the actual source language.
- **No static fixtures as executable readiness or zero billing**: Interpreter/dependencies and provider usage remain unknown without observations.

### Better Approach
Screen each proposed change against exclusions before assigning a slot. Load actual file-matched rules and record exactly what returned, without calling common bodies a language-specific skill. Accept an honest missing candidate as a blocker. Preserve required approval, runtime and billing unknowns; provide an owner scope choice instead of quietly expanding protected scope.

### Trigger Miss
Procedure miss: relevant file routing was available but initially bypassed; no trigger alias or registry promotion is established.

---

## Agent Learning Log: Iteration #15

**Date**: 2026-10-12 | **Task**: Retract a source-only pilot candidate already supported.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: candidate-screening-before-slot-filling | **Status**: proposed
**Provenance**: reviewed Personal study base `b529c2d99112db2af63aa2c32365a37759613cc6`; public `artifacts/runs/cross-project-harness-pilot/20261011T154929Z-g1-ezrx-documents.json`.
**Evaluation**: not-run; source inspection and retraction are not held-out skill evaluation
**Review**: pending; existing candidate extended, no maintenance/promotion approval
**Rollback**: not-applicable; proposal only

### Mistake Made
A candidate dossier assumed a missing behavior from source-only discovery. Independent inspection of the actual parser/caller and existing test input/assertions showed the behavior already implemented; the proposed candidate was withdrawn.

### Pattern to Avoid
- **No declaration/catalog as implementation proof**: Collapsed declarations can hide normalization and existing supported cases.
- **No slot-preserving invention**: Whitespace/line-ending variants do not become bugs merely because a planned slot is empty.

### Better Approach
Inspect the complete current parser, caller order and existing test input plus assertions before accepting a bug card. Withdraw a false candidate, retain the original assessment/correction, and seek separately authorized genuine discovery rather than widening the alleged bug.

### Trigger Miss
None established: evidence procedure failed; no new keyword alias or promoted rule is justified.

---

## Agent Learning Log: Iteration #16

**Date**: 2026-10-12 | **Task**: Bind reviewed working bytes before readiness execution.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: reviewed-working-basis-before-runtime | **Status**: proposed
**Provenance**: reviewed Personal study base `b529c2d99112db2af63aa2c32365a37759613cc6`; public `artifacts/runs/cross-project-harness-pilot/20261011T203836Z-implementation-readiness.json`.
**Evaluation**: not-run; corrected seven-case readiness is task proof, not guidance evaluation
**Review**: pending; no canonical maintenance authorization
**Rollback**: not-applicable; proposal only

### Mistake Made
Initial readiness ran six tests on committed HEAD although the reviewed task basis included relevant preexisting working changes and seven tests. Passing committed-base readiness did not establish correspondence with the approved card.

### Pattern to Avoid
- **No same HEAD as same working input**: Dirty overlays can contain already implemented behavior and meaningful tests.

### Better Approach
Compare approved relevant root/workspace byte digests before runtime. On mismatch, stop that readiness claim and obtain exact snapshot authority; copy only the authorized relevant overlay into owned allocations, preserve the original source, then refresh only proof invalidated by the mismatch.

### Trigger Miss
None established: source-basis procedure, not proof of missing runtime tooling.

---

## Agent Learning Log: Iteration #17

**Date**: 2026-10-12 | **Task**: Correct a preparation owner's cross-domain return.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: session
**Candidate**: outbound-metadata-allowlist-before-transfer | **Status**: proposed
**Provenance**: reviewed Personal study base `b529c2d99112db2af63aa2c32365a37759613cc6`; sanitized readiness record `artifacts/runs/cross-project-harness-pilot/20261011T203836Z-implementation-readiness.json`.
**Evaluation**: not-run; corrected reply is not technical schema/egress attestation
**Review**: pending; no control, instruction or registry promotion authorized
**Rollback**: not-applicable; proposal only

### Mistake Made
The preparation owner's initial reply exceeded the metadata-only boundary with private identifiers/path/command detail and overbroad privacy language. A completed-actor corrective receipt removed those details; it could not undo the earlier transfer.

### Pattern to Avoid
- **No no-file-read claim as no-transfer proof**: Private detail can arrive in a worker's response without the controller opening a private file.

### Better Approach
Specify neutral labels, allowed basenames/digests/results and forbidden payload fields before dispatch. For a future authorized synthetic experiment, independently check the outbound allowlist before forwarding; preserve rejected/overshared attempts and leave technical enforcement unverified unless exercised.

### Trigger Miss
None established: return-interface/workflow failure; available instruction text did not enforce a transport boundary.

---

## Agent Learning Log: Iteration #18

**Date**: 2026-10-12 | **Task**: Correct a separate readiness reviewer's return.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: session
**Candidate**: outbound-metadata-allowlist-before-transfer | **Status**: proposed
**Provenance**: reviewed Personal study base `b529c2d99112db2af63aa2c32365a37759613cc6`; same sanitized readiness record, second actor handoff event.
**Evaluation**: not-run; no denied-egress/alternate-route probe authorized
**Review**: pending; repeated failure does not authorize automatic instruction/control promotion
**Rollback**: not-applicable; proposal only

### Mistake Made
The independent readiness reviewer's initial handoff also included private identifiers/markup and overly broad transfer/egress claims. Its final sanitized qualification corrected the artifact wording, not the history or host guarantees.

### Pattern to Avoid
- **No independent role as confidentiality mechanism**: Review separation does not filter an outbound payload.

### Better Approach
Apply the same explicit neutral-field interface to reviewers as owners. Keep source/code inspection domain-local and return only approved metadata; evaluate a synthetic pre-forward rejection path under separate authority before describing it as enforcement.

### Trigger Miss
None established: repeated interface/evidence procedure. Proposal remains unpromoted despite the generic repeat-mistake shortcut.

---

## Agent Learning Log: Iteration #19

**Date**: 2026-10-12 | **Task**: Separate temporary cleanup from intentional dirty source.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: dirty-overlay-versus-owned-scaffold-receipts | **Status**: proposed
**Provenance**: reviewed Personal study base `b529c2d99112db2af63aa2c32365a37759613cc6`; public `artifacts/runs/cross-project-harness-pilot/20261012-ezrx-deliveries.json`, R1 initial/corrected receipt history.
**Evaluation**: not-run
**Review**: pending; accepted code review is not maintainer approval of this proposal
**Rollback**: not-applicable; proposal only

### Mistake Made
The initial R1 receipt asserted a clean working tree although the allocation intentionally retained a reviewed working overlay and uncommitted fix. One metadata correction separated scaffold absence from Git state without repeating passing code checks.

### Pattern to Avoid
- **No cleanup boolean as whole-tree cleanliness**: Removed throwaways do not remove legitimate source changes.

### Better Approach
Record owned scaffold removal, total tracked modifications, preexisting overlay versus owned changes, authored commits and unknown whole-tree coverage separately. Bind corrected receipts to the same settled source without rerunning unaffected runtime evidence.

### Trigger Miss
None established: receipt-field semantics, not a tooling absence.

---

## Agent Learning Log: Iteration #20

**Date**: 2026-10-12 | **Task**: Block an empirically reproduced preservation regression.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: empirical-data-loss-over-advisory-severity | **Status**: proposed
**Provenance**: reviewed Personal study base `b529c2d99112db2af63aa2c32365a37759613cc6`; same current delivery record, R1 novel triage, bounded repair and separate final re-review.
**Evaluation**: not-run; actual permanent regression/consumer proof is code evidence, not skill-eval promotion
**Review**: pending; no authenticated maintainer decision/eval
**Rollback**: not-applicable; proposal only

### Mistake Made
Initial review passed all five written AC and labeled a restoration-marker concern MINOR. A new pure synthetic edge reproduced introduced literal-text loss and duplicate output; keeping the minor label could have waived a real consumer regression.

### Pattern to Avoid
- **No AC checklist or severity label as waiver**: Actual corruption remains blocking even outside the enumerated happy paths.
- **No reproducer exit0 as desired-behavior PASS**: Successful defect detection means the defect was observed.

### Better Approach
Compare the novel behavior with the pre-change source, promote reproduced introduced corruption to blocking quality, and assign the same owner one bounded repair with a meaningful preservation regression. Refresh affected checks and separate revision-bound review only; preserve initial acceptance/failure history.

### Trigger Miss
None established: review/evidence interpretation, not an alias gap.

---

## Agent Learning Log: Iteration #21

**Date**: 2026-10-12 | **Task**: Correct historical versus current delivery metadata.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: scoped-current-and-historical-artifact-bindings | **Status**: proposed
**Provenance**: reviewed Personal study base `b529c2d99112db2af63aa2c32365a37759613cc6`; same delivery record, R2 initial and corrected report/receipt/package digests.
**Evaluation**: not-run
**Review**: pending; no registry-maintenance/promotion approval
**Rollback**: not-applicable; proposal only

### Mistake Made
R2's first metadata return referenced the earlier R1 preflight as accepted/current, conflated two owned changes with four total tracked changes, and blurred approved execution with pending outcome/adoption acceptance. One metadata-only follow-up rebound the complete final interface.

### Pattern to Avoid
- **No historical digest as current repaired revision**: Multiple valid stage hashes need explicit stage/workspace scope.
- **No gate conflation**: Execution authority, outcome review and human adoption are distinct.

### Better Approach
Publish complete neutral maps by allocation/root, exact consumed/current artifact bindings, owned/preexisting/total counts and each gate's actual status. Retain earlier values as chronological history; no source copying or rerun of unaffected passing evidence to repair metadata.

### Trigger Miss
None established: revision/state bookkeeping, not a model/quota failure.

---

## Agent Learning Log: Iteration #22

**Date**: 2026-10-12 | **Task**: Qualify the final peer's audit and completion claims.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: session
**Candidate**: control-claims-require-action-observation-proof | **Status**: proposed
**Provenance**: reviewed Personal study base `b529c2d99112db2af63aa2c32365a37759613cc6`; same delivery record, initial/final independent review and paired closure digests.
**Evaluation**: not-run; no host-denial or egress exercise authorized
**Review**: pending; extends Iteration13's existing proposal, no automatic promotion
**Rollback**: not-applicable; no instruction/skill/control changes

### Mistake Made
The final independent peer's header called loaded standards actively enforced and initially blurred four accepted deliveries with whole-study completion. One metadata-only qualification preserved the successful 22-assertion source-bound lane while distinguishing pending synthesis/review/human adoption and unverified host controls.

### Pattern to Avoid
- **No lookup audit as behavioral or technical enforcement proof**: Returned bodies are consultation evidence.
- **No delivery denominator as whole workflow**: Four accepted candidates do not complete final synthesis, review or human adoption.

### Better Approach
State separately loaded guidance, independent scoped assessment, actual consumer evidence, observed individual tool approvals and unverified OS/network/alternate-route guarantees. Bind corrected own artifacts without rerunning passing code, retain earlier overclaims, and require explicit maintenance authority/evaluation/independent approval before any repeated-rule promotion.

### Trigger Miss
None established: recurring evidence/template procedure. Existing guidance proposal extended; no canonical edits or held-out evaluation claimed.

---

## Agent Learning Log: Iteration #23

**Date**: 2026-10-12 | **Task**: Correct final document-consumer inventory.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: actual-inventory-before-consumer-paths | **Status**: proposed
**Provenance**: reviewed Personal study base `b529c2d99112db2af63aa2c32365a37759613cc6`; owned final checker and current public delivery record.
**Evaluation**: not-run; rerun after concrete checker fix is verification, not a skill evaluation
**Review**: pending; no canonical maintenance/promotion authority
**Rollback**: not-applicable; proposal only

### Mistake Made
The inherited final checker selected nonexistent `g1-independent-review.md`; actual public artifact is `g1-discovery-review.md`. Initial metadata checks and five documents passed, then the consumer exited1/0.08s on ENOENT before hash/cleanup checks, leaving the owned checker present.

### Pattern to Avoid
- **No plausible artifact name as confirmed inventory**: Carried summaries do not prove a path exists.

### Better Approach
Read the actual authorized directory inventory, replace only the wrong selected basename with its existing counterpart, retain all thirteen document/binding/hash/ownership assertions, and rerun the failed final consumer once. Preserve the failure and observe owned cleanup; do not rerun unaffected code checks.

### Trigger Miss
None established: inventory/procedure error, not a missing tool.

---

## Agent Learning Log: Iteration #24

**Date**: 2026-10-15 | **Task**: Move product-owned skills without native ownership churn.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: post-prune-render-retains-active-owners | **Status**: proposed
**Provenance**: rebased migration `d2116357`; plan-local product-category-move-rereview-3.md.
**Evaluation**: deterministic lifecycle regression passed; no held-out skill evaluation or promotion
**Review**: scoped implementation review PASS; not maintainer approval of a guidance change
**Rollback**: no shared guidance changed

### Mistake Made
The first migration renderer refreshed indexes before pruning. Deferring rendering then exposed unchanged index and bridge entries to pruning, causing redundant backups on no-op syncs.

### Better Approach
Exercise the production completion path: prune retired owners, retain still-selected deferred-render owners, refresh their files before manifest persistence, and verify final hashes. Use a non-Claude owned bridge and a third no-op sync to assert no delete/re-add or backup churn while preserving unowned files.

### Trigger Miss
None established. The missing case was lifecycle ordering and ownership interaction, not an unavailable skill.

---

## Agent Learning Log: Iteration #25

**Date**: 2026-10-15 | **Task**: Keep lifecycle tests compatible with the CI runtime.
**Signal**: Session retrospective
**Skills**: common/common-session-retrospective, common/common-learning-log
**Scope**: project
**Candidate**: exercise-existing-ci-runtime-floor | **Status**: proposed
**Provenance**: PR234 CI38745679668, unit job116458568144, source `c23c2614`
**Evaluation**: CI observed one Node20 failure; local Node22 passed. No held-out skill evaluation.
**Review**: pending; no guidance promotion
**Rollback**: no shared guidance changed

### Mistake Made
The asynchronous lifecycle regression used `Promise.withResolvers`, which is available locally on Node22 but unavailable in the existing Node20 coverage job. All other CLI tests and the actual installed-consumer job passed.

### Better Approach
Use standard Promise executors with captured resolvers for deterministic barriers. Preserve ordering assertions and the existing CI runtime; verify the actual coverage command and observe the next Node20 CI result rather than inferring compatibility from a newer local runtime.

### Trigger Miss
None established. The missed verification boundary was the existing CI runtime, not a missing project skill.


---

## Agent Learning Log: Iteration #26

**Date**: 2026-10-25 | **Task**: Evaluate agent-qa regression evidence guidance.
**Signal**: Session retrospective
**Skills**: common/common-skill-creator, quality-engineering/quality-engineering-agent-qa
**Scope**: project
**Candidate**: agent-qa-eval-command-and-outcome-contract | **Status**: proposed
**Provenance**: base `a2228857e4cf5b8ee2d71d96630c586618ec2edd`; immutable `agent-qa-development-2026-10-25-iteration1` inputs and answers
**Evaluation**: iteration 1 retained; fresh iteration 2 planned with unchanged model and worker isolation
**Review**: pending; no release promotion
**Rollback**: iteration 1 immutable inputs

### Mistake Made
The initial eval-1 string assertions accepted an invalid `agent-qa select` command while rejecting a correct explanation that a dry run does not establish passing tests. Initial wording checks also rejected valid uncertainty phrasing in baseline answers.

### Pattern to Avoid
- **No lexical score as behavioral proof**: inspect commands and meaning before attributing a score difference to the skill.

### Better Approach
Use exact command regexes and outcome checks that accept equivalent uncertainty phrasing; retain failed iterations and review grader changes separately from skill efficacy claims. Keep native verdicts, registry healing evidence, and executable results distinct.

### Trigger Miss
None established; the root cause was evaluator precision, not routing.


---

## Agent Learning Log: Iteration #27

**Date**: 2026-10-25 | **Task**: Verify agent-qa consumer routing.
**Signal**: Session retrospective
**Skills**: common/common-skill-creator, common/common-tdd
**Scope**: project
**Candidate**: agent-qa-exact-config-routing | **Status**: proposed
**Provenance**: `mcp/test/AgentQaRouting.spec.ts`; initial real-registry config lookup returned no match
**Evaluation**: expected RED before adding the missing YAML category route; focused GREEN check follows
**Review**: pending; no guidance promotion
**Rollback**: remove the new YAML route and agent-qa catalog entry together

### Mistake Made
The new skill declared an exact `agent-qa.config.yaml` trigger, but `skills/metadata.json` did not route the YAML extension to quality-engineering. Frontmatter validation and language-model routing answers did not detect this consumer integration gap.

### Pattern to Avoid
- **No metadata-only routing proof**: a valid skill trigger can still be unreachable through the real category router.

### Better Approach
Exercise the production SkillIndex against real registry content, including exact-config positives and generic-file negatives. Add the missing extension route while retaining the narrow filename glob.

### Trigger Miss
The runtime router lacked the extension mapping; the skill's explicit keyword triggers already worked.
