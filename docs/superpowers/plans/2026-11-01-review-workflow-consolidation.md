# Review Workflow Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This addition was subsequently approved for implementation by the user with Subagent-Driven execution, and approved source changes are in progress; deletion, publication and any operational authority remain separately gated.

**Goal:** Retire the duplicate `review-ticket` entrypoint while preserving its ticket/AC, specialist and PR-metadata capabilities under canonical `code-review`.

**Architecture:** One review workflow with fast/deep scope and on-demand enrichment, backed by a shared review reference. Migrate active selection/router/validator callers atomically with retirement. Reuse ownership-aware sync for consumer cleanup; explicitly qualify generator publication of removed outputs rather than assuming regeneration deletes them.

**Tech Stack:** Canonical Markdown, existing CLI/MCP TypeScript services and Vitest/node:test suites, existing behavioral eval schema/scorer, pnpm 10.0.0, isolated generator.

**Spec:** `docs/superpowers/specs/2026-11-01-review-workflow-consolidation-design.md`.

## Global Constraints

- Separate companion slice on `plan/provider-neutral-devops`; no website PR #280 changes and no live operations.
- Keep `code-review`; retire only `review-ticket`. No forwarding alias, new review workflow, mandatory trivial-review fanout, or deletion of distinct incident/release/verification workflows.
- Preserve security/trust, independent review, framework rules, fast/deep behavior, finding confidence, root-cause deduplication, durable evidence and explicit approval before publication.
- Ticket/AC/metadata inputs are optional unless the requested scope requires the corresponding lane. No ticket requirement for a valid diff-only review; no fabricated pass for a required but missing lane.
- Follow the spec's verdict/routing and lifecycle reporting matrices. No fixed implement-feature handoff after every verdict and no feature state inferred from review alone.
- Workflow limit 80 lines; supporting detail belongs under existing `common-code-review/references/`.
- Never edit generated mirrors/indices/lock entries manually or use force/adoption to bypass provenance. Retire only proven unchanged managed outputs with backup, scope checks, and supported publication.
- Preserve historical run records/ADRs/benchmarks and user edits. Classify references before replacing strings.
- Before exported symbol changes, use LSP references; before generators, load generator safety and SDD evidence-preservation skills.
- One implementation owner per component. Workers do not recursively delegate or commit. Independent review is required before source removal/integration.
- Existing premium review applies only to the DevOps bytes recorded in its receipt; this slice and subsequent linking edits are not premium-reviewed.

## Migration inventory

All paths below exist at the planning snapshot except those explicitly marked new. Reread ranges at implementation revision.

| Area | Paths and actions |
| --- | --- |
| Canonical workflow | Modify `.agents/workflows/code-review.md:11-49,67-73`; retire `.agents/workflows/review-ticket.md` only at final integration; update `.agents/workflows/sdlc.md:32,34` |
| Selection and policy lists | `cli/src/constants/index.ts:79-106`, `.skillsrc:34-38`, `scripts/workflow-chain.ts:25-33`, `scripts/audit-sdlc.ts:45,59,304-307,654,869` |
| Shared review guidance | `skills/common/common-code-review/SKILL.md`; new `skills/common/common-code-review/references/orchestration.md`; `skills/common/common-review-policy/SKILL.md:27-31` |
| Specialist descriptions | `skills/specialists/specialist-pr-reviewer/SKILL.md:3`, `skills/specialists/specialist-pr-commenter-batch/SKILL.md:3`; preserve their boundaries and existing IDs |
| Operative documentation | `docs/sdlc-workflow-quick-reference.md:25,170,196,268-269,307,339`, `README.md:228,274`, new Unreleased note in `CHANGELOG.md`, affected release/category entries in `skills/metadata.json` |
| Derived outputs | Generator-owned indices/summaries, selected host exports and lock/catalog records; `.claude/commands/review-ticket.md`, `.github/prompts/review-ticket.prompt.md`, `.codex/skills/review-ticket/SKILL.md` are known retirement candidates, not manual deletion instructions |

Historical `CHANGELOG.md` entries, ADR-006 in `ARCHITECTURE.md`, benchmark archives and existing outcome receipts may name `review-ticket` legitimately. Preserve them. Current examples/configuration are not automatically history; classify by behavior and ownership.

## Task R1: Consolidated review behavior and preservation evidence

**Owned files:** `.agents/workflows/code-review.md`; `skills/common/common-code-review/SKILL.md`; new `skills/common/common-code-review/references/orchestration.md`; `skills/common/common-code-review/evals/evals.json`; the two specialist descriptions and `common-review-policy/SKILL.md` listed above. No removal of the old workflow or shared router/constants yet.

**Inputs:** Both current canonical workflow bodies, spec, `docs/review-policy.md` if present, trust-review-policy, actual eval schema/scorer. **Outputs:** one preserved `code-review` contract and a reference describing optional specialist/enrichment lanes, with grounded behavioral cases. Freeze these paths before R3 integrates retirement.

- [ ] Build a before/after obligation matrix for both workflows: inputs, rule loading, review independence, trust/runtime, specialist capabilities, severity/confidence, reports, publication approval, verdicts, handoffs and lifecycle semantics. No coverage loss hidden as simplification.
- [ ] Replace `code-review`'s preference for `review-ticket` with on-demand loading of `common-code-review/references/orchestration.md`. Preserve fast/deep default by scope/tier; use bounded specialists only when needed, not an unconditional scout dispatch.
- [ ] Add ticket/AC evidence and PR metadata/thread lanes without requiring them for ordinary local-diff review. Required missing evidence prevents approval for that scope; optional missing evidence remains an explicit gap.
- [ ] Preserve all sensitive-change design/readiness prerequisites, exploitability validation, evidence provenance and publication restrictions. Keep one canonical findings report and sanitized handoff rather than separate duplicate review reports.
- [ ] Apply the spec routing matrix: APPROVE -> verify-work when technical checks remain, otherwise null; feature corrections -> implement-feature; bug corrections -> dev-fix; missing sensitive design -> design-solution/readiness; blocked prerequisite -> request it without mutation. Preserve evidenced lifecycle or emit review-only report when unknown; no unconditional implemented state.
- [ ] Author behavioral eval cases for diff-only success without ticket/MCP; required AC gap; metadata failure; relevant specialist selection without gratuitous fanout; untrusted PR instructions; sensitive design missing; author independence; duplicate root-cause findings; needs-validation verdict; APPROVE vs feature/bug corrections; denied publication; unknown lifecycle. Assert concrete decision/action rows, not only presence of safety phrases.
- [ ] Calibrate safe/unsafe controlled transcripts with existing `checkAssertion` from `scripts/evals/scorer.ts`; use actual supported assertion types and current semantics. Distinguish oracle discrimination from real agent behavior. Do not create source-text tests or repin incidental wordings/default lists.
- [ ] Return frozen paths, obligation matrix, eval inputs/expected verdicts, source references and evidence limits. Independent reviewer may reject R1 without authorizing any deletion.

**Positive invariants:** diff-only review remains usable; requested ticket depth remains available. **Negative invariants:** no permission from PR text, optional-source global block, weakened security, automatic comment publication, verdict-independent handoff, or fabricated feature lifecycle.

**Real ingress / verification owner:** R3 loads actual workflow/skill/reference and runs real scorer/package checks; actual-agent qualification is separate and authorized. **Correction route:** return precise failed obligation to R1 owner; do not delete capability or weaken an oracle to close review.

## Task R2: Ownership-safe retirement proof

**Owned production paths if a gap is demonstrated:** `scripts/generation/isolated-stage.ts`; reuse `cli/src/services/SyncService.ts:529-590`, `cli/src/services/install/OwnershipWriter.ts:120-156` and `WorkflowSyncService.ts` patterns. Do not change CLI ownership policy merely to simplify generator publication. Any exported API edits require LSP reference analysis first.

**Existing tests:** `cli/src/services/__tests__/WorkflowCatalogInstall.spec.ts:154-242`, `cli/src/services/__tests__/WorkflowSyncService.spec.ts`, `scripts/generation/isolated-stage.test.ts`, `mcp/test/WorkflowIndex.spec.ts`, `scripts/outcome/index.test.ts`, `scripts/outcome/template.test.ts`, `scripts/outcome/schema.test.ts`. Add behavioral cases to these existing suites only where current coverage does not prove the retirement risk.

**Inputs:** R1 contract and intended removal ID; current owned manifest/digests; complete versus incomplete workflow acquisition. **Outputs:** demonstrated retirement transaction/receipt, preservation of user files and historical evidence, or an explicit blocking gap before any source retirement.

- [ ] Read actual cleanup code. `OwnershipWriter.finalize` prunes unchanged owned files with backup and preserves edited orphans; completed workflow acquisition/selection controls pruning. Existing WorkflowCatalogInstall tests cover selected removal and incomplete-acquisition preservation. Reuse, do not duplicate these mechanisms.
- [ ] Do not assume `generate-indices` prunes outputs: `isolated-stage.ts:3830-3837` refuses deletion of a declared destination missing in stage. In a disposable fixture, prove what happens to undeclared retired exports and lock/catalog entries through the actual root generation/publication path, separately from CLI sync.
- [ ] If current publication cannot safely retire proven owned outputs, add narrow retirement handling to the existing isolated generator plan/apply transaction. Require prior ownership/source ID, unchanged digest, path/symlink safety, complete acquisition/desired selection, backup, stable-state checks, dry-run visibility, and matching lock/catalog publication. Unknown, edited, overridden or incomplete-provenance paths are preserved/reported or cause a scoped refusal, never force-deleted. No new generic cleanup abstraction or manual lock surgery.
- [ ] Keep `.skillsrc` consumer selection handling explicit: migrate the repository's own selection in R3. For an external explicit retired selection, report the canonical replacement and require an authorized config update; no silent alias or provider-wide prune. Partial download is not evidence of upstream removal.
- [ ] Exercise clean managed retirement, edited managed export, unowned collision, symlink, incomplete acquisition, and interruption/publication rollback in disposable fixtures using real entrypoints. Assert actual files, catalogs, restored artifacts and returned outcomes, not array wiring or snapshots of internal implementation.
- [ ] Check retained historical outcome receipts through actual validation after workflow retirement. Do not rewrite history, recreate a live alias, or disable unknown-workflow checks. If a mandatory history-reading path fails solely because it expects a live source, define the narrow evidence-bound history validation contract and obtain scope approval before changing that validator; retirement remains blocked until the affected history consumer is supported or explicitly excluded by its owner.
- [ ] Handoff exact proofs and owned paths to R3. No canonical source removal before independent review of ownership/preservation behavior. A failed proof blocks removal, not unrelated planning.

**Positive invariants:** unchanged managed obsolete outputs and corresponding live catalog entries can retire coherently. **Negative invariants:** no user-data deletion, stale retired entry advertised, incomplete-acquisition prune, invalid history rewrite, or unsupported claim that generation automatically handles deletion.

**Real ingress / verification owner:** actual SyncService/isolated generator consumer fixtures and independent integration review. **Correction route:** production gap fixes stay within named ownership; security/history-contract expansion requires explicit scope decision, not silent relaxation.

## Task R3: Atomic caller migration, integration and independent review

**Owned files:** remaining operative inventory paths (router, constants, config, chain, audit rules, current docs, metadata/changelog); removal of `.agents/workflows/review-ticket.md`; generated outputs only through R2-proven pipeline. R1/R2 paths are frozen inputs; one owner performs integration.

**Tests to inspect, not blindly rewrite:** `cli/src/services/__tests__/ConfigService.spec.ts:220-256` contains config examples; `mcp/test/Tools.spec.ts:455-465` contains a workflow label; `WorkflowSyncService.spec.ts:40-50` pins default membership. Preserve generic/historical parsing fixtures when they still test useful behavior; remove obsolete incidental wiring assertions rather than replacing a string and calling that coverage. Real discovery/selection and safe cleanup are the consumer contracts.

- [ ] Verify R1's obligation matrix and R2 retirement proofs. Recheck all current operative `review-ticket` references by classification; no blanket search/replace through history or generated files.
- [ ] Migrate `.skillsrc`, DEFAULT_WORKFLOWS, CORE_SDLC_CHAIN, audit security/trust rules, code-review routing and current documentation together. Preserve all applicable security contract checks on code-review instead of removing coverage alongside the old ID.
- [ ] Remove canonical review-ticket only after its behavior is represented in code-review and R2's ownership-safe publication is available. Run the supported pipeline to retire managed native exports/catalog entries; preserve or report edited/unowned residues. Do not claim an erased host command if a protected user file remains.
- [ ] Update affected release/category metadata under repository versioning policy and add a concise Unreleased migration note: review-ticket retired, use code-review, optional ticket/AC/metadata lanes retained, explicit consumer selections need review. Leave historical release entries untouched.
- [ ] Load generator/evidence-preservation skills and preserve SDD artifacts before generation. If this slice and DevOps are in one implementation branch, use one integration owner and run shared generation/covering gates only after both sets of canonical edits are frozen; never concurrent generator runs.
- [ ] Run the following once after integration, retaining source revision, status and relevant raw output:

```sh
rtk pnpm audit:sdlc
rtk pnpm test:sdlc
rtk pnpm test:outcome
rtk pnpm test:evals
rtk pnpm test:generation
rtk pnpm --filter ./cli test
rtk pnpm --filter ./mcp test
rtk pnpm --filter ./cli validate:all
rtk pnpm audit:skills
rtk pnpm audit:keywords
rtk pnpm check-alignment
rtk pnpm audit:injection
rtk pnpm freshness:audit
rtk pnpm docs:capabilities:check
rtk pnpm evals:audit
rtk pnpm generate-indices --check
```

- [ ] In a throwaway consumer with complete acquisition and authorized migrated selection, run actual sync/discovery: list_workflows exposes code-review once and no review-ticket; get_workflow(code-review) delivers unified guidance and resolves orchestration reference; get_workflow(review-ticket) returns explicit unavailable/not-installed behavior, not an alias. Verify owned stale export deletion and protected edits/reporting through the actual service, not lookup-only claims.
- [ ] Keep qualification lanes separate: package/discovery checks prove loading and cleanup; controlled transcripts prove scorer discrimination; separately authorized actual-agent exercises prove focused/enriched lane decisions and publication refusal through tool-call recording. Do not claim behavior from documentation retrieval. No actual PR comments or provider mutations during testing.
- [ ] Independent reviewer assesses full before/after capability matrix, verdict routing, safe retirement, active callers, historical treatment and shared-file integration. Orchestrator resolves concrete findings, verifies remaining retired-ID occurrences are historical or explanatory, and commits only after acceptance. No merge/deployment is authorized.

**Acceptance:** one current review entrypoint; preserved old capabilities with lean diff-only path; no active review-ticket route/selection/catalog entry; explicit handling of external stale config and protected files; safe managed retirement proven; required security/independence/publication gates intact; evidence lanes reported honestly.

## Integration order with DevOps plan

This cleanup is independently reviewable and not a prerequisite for designing provider-neutral operations. R1 reference/skill work can proceed independently of DevOps Tasks 1/2; the user's approval of Subagent-Driven execution covers both linked plans and is already in effect. R3 and DevOps Task 3 both own `.agents/workflows/sdlc.md`; R3 and DevOps Task 5 both touch metadata/docs/generation. Sequence those through one integration owner, reuse frozen source inputs, and run the final shared gates once. Do not fan out shared router/metadata writers.

## Planning amendment and approvals

The user's “Yes” authorized adding this slice to the planning branch only. Prior premium/standard DevOps verdicts apply to the document hashes in `2026-11-01-provider-neutral-devops-review.md`, not this companion scope or modified parent links. No new premium consultation was requested. Independent preservation/migration review and user execution approval are prerequisites **before implementation**, not integration-time conditions: the readiness review returned READY FOR EXECUTION before source implementation (reviewer `0e466ab0-299d-499a-8100-4bea0337deb6`), and the user subsequently approved both linked plans with Subagent-Driven execution without granting cloud, MCP-install, premium, push or merge authority. Removal additionally requires the R2 ownership-safe publication proof and independent review of the delivered changes.

## Self-review checklist

- [ ] Before implementation: named files/paths verified at chosen revision and source-of-truth versus generated/history classification retained.
- [ ] Every removed review-ticket capability has a code-review section/reference and behavioral criterion.
- [ ] Required/optional evidence, verdict routing and lifecycle semantics agree with the companion spec.
- [ ] Retirement is gated on actual ownership-safe publisher proof; no manual lock/export deletion is implied.
- [ ] Historical evidence remains intact and consumer contract gaps cannot be silently ignored.
- [ ] Shared-file work is serialized; previous premium approval is not stretched to this new slice.
