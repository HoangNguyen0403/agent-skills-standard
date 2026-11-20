# Walkthrough: SDLC Workflow-Wide Continuation

## Scope and verdict

**Producer handoff snapshot — 2026-11-20.** CANONICAL SOURCE DELIVERED; native export refresh produced in this worktree through the guarded adoption. Validation checks and CI were **not** run by the producer; authoritative later verification is tracked with PR #340. Structural checks and live MCP retrieval recorded below predate that handoff; current actual-consumer outcomes and qualification limits are indexed in verifier-owned `.sdd/sdlc-workflow-continuation/consumer-summary.json`. No full verification or installed-host parity PASS is implied by this snapshot.

Approved work item: [PRD](../prd/prd-sdlc-workflow-continuation.md) (SHA-256 `c6698b765eec40c73e9663642d666592f9cc55dacebc365c83e1d5ed7bf6ab12`), [SRS](../srs/srs-sdlc-workflow-continuation.md) (SHA-256 `a599039007d7744f8633333f6022ed2293ac771eb34ff0c0013d09963a4bd9c7`), extended delivery, high SNC, BASE `11c8bd1a72be5935bafbd45c63d8236baab804fb`. Operator approved plan/design and repository implementation, independent review, and verification on 2026-11-18; no merge, deploy, activation, premium, or host configuration.

Canonical criteria live once in the PRD; this document records only technical verification status and boundaries.

## Delivered changes

- `skills/common/common-decision-discipline/SKILL.md` §8 Continuation: self-contained normative contract returned by installed-file reads and MCP `get_skill`, covering opt-in precedence, actual-result successor selection and validation ordering, the four continuation outcomes, carried task context, capability-gap pauses, no-progress, recovery reconciliation, and evidence honesty. The description/triggers now cover handoff and `auto_continue` activation.
- All consumer-facing canonical workflows (`.agents/workflows/*.md` except internal-only `evals-run`) load that skill at entry and reference §8 at every handoff. `evals-run` distribution remains excluded.
- `skills/metadata.json`: `categories.common` `2.9.9 -> 2.9.10`, `last_updated 2026-11-18`; `releases.workflows` `2.1.5 -> 2.1.6`.
- Docs: `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/sdlc-workflow-quick-reference.md`, `CHANGELOG.md`.
- Native export refresh completed on 2026-11-20 in the current-feature worktree `/tmp/ags-ci-repair-adopt-1dd8623` through public producers and unchanged ownership guards. Public `pnpm calculate-tokens` separately updated `skills/metadata.json` token metrics (pre-feature baseline `common` total `54106` → final feature `54865`; prerequisite only, no ownership grant, no repair of arbitrary changed aggregates or configurations). The strict `pnpm generate-indices --adopt-base 15048dd242bd1eadf825b680e7085d75abef0148` run then copied back 108 paths = 107 tracked generated outputs (96 workflow exports across Claude commands, Codex skills, and Copilot prompts; 8 `common` skill mirrors including `_INDEX.md`; `skills/index.json`, `skills/README.md`, `skills/common/_INDEX.md`) plus the gitignored local ownership lock; `skills/metadata.json` appears in neither `adopted` nor `copiedBackFiles`. `15048dd242bd1eadf825b680e7085d75abef0148` is a retained LOCAL producer reference created for this work, not a public release tag or a ref available in fresh clones; the portable check against the final PR revision is `pnpm generate-indices --check`, whose result this snapshot does not report. Receipt: `artifacts/generation-logs/attempt-2026-11-20T07-36-57-056Z-e20cdb/`. No installed copy was manually overwritten and no provenance guard was bypassed.

## Acceptance evidence

| Criterion | Result | Evidence |
| --- | --- | --- |
| AC-001..AC-004, AC-016..AC-018, AC-020 | Verifier evidence index | Not run by the implementation worker; current actual-consumer receipts and independent qualification are in the verifier-owned consumer summary, not inferred from these source edits. |
| ref: AC-005 | REFRESHED (producer evidence, 2026-11-20) | Existing exporter target passes 42/42. Strict adoption in the feature worktree added 107 producer-matched proofs and copied 107 tracked generated outputs plus the ignored lock; `skills/metadata.json` was updated separately by `pnpm calculate-tokens` (`common` `54106` → `54865`). Receipt `artifacts/generation-logs/attempt-2026-11-20T07-36-57-056Z-e20cdb/`. Clean-consumer `--check` and CI status are tracked at PR #340. |
| ref: AC-006 | PASS (live lookup only) | Orchestrator called actual MCP `get_workflow(session-report)` and `get_skill(common, common-decision-discipline)`; returned workflow references §8 and returned skill contains the complete contract. This is retrieval evidence, not successor execution. |
| AC-007, AC-010, AC-011, AC-021 | Verifier evidence index | Actual-result routing, terminal/capability outcomes and procedure return are assessed from task-local performed-work artifacts and observable tool operations in the consumer summary. |
| AC-008, AC-009, AC-019 | Verifier evidence index | Authority/scope/argument pauses are assessed from actual local consumer outcomes; no production authorization or enforced host sandboxing is claimed. |
| AC-012..AC-014 | Verifier evidence index | Recovery/local-effect/no-progress observations and verifier-observed preserved-input hashes are in the consumer summary; the local publication analogue is not external exactly-once proof. |
| ref: AC-015 | Evidence boundary retained | Structural/export and live-lookup checks remain separate from actual successor execution; this snapshot reports the native refresh as produced by guarded adoption in the current-feature worktree, whose base reference is local-only. Later verification status is tracked at PR #340. |

## Actual checks and boundaries

| Check | Observed result | Boundary |
| --- | --- | --- |
| `rtk pnpm audit:sdlc` | PASS | Validates workflow structure, line limits, and required sections on the edited source. |
| `rtk pnpm --filter ./cli exec vitest run src/services/utils/__tests__/WorkflowTransformer.spec.ts` | Run after source settled; exact result recorded in `.sdd/sdlc-workflow-continuation/task-1-report.md` | Proves export rendering behavior only, not semantic continuation. |
| `rtk pnpm calculate-tokens`; `rtk pnpm generate-indices --adopt-base 15048dd242bd1eadf825b680e7085d75abef0148` | APPLIED (2026-11-20, current-feature worktree): 107 adopted proofs; copied back 107 tracked generated outputs + ignored ownership lock | Metrics synchronization was prerequisite only (its own pre-feature `54106` → feature `54865` values; no ownership); the strict adoption independently proved retained local base `15048dd24…`. Exact receipt `artifacts/generation-logs/attempt-2026-11-20T07-36-57-056Z-e20cdb/receipt.json` with `adoption/proof.json`; failure-path refusals remain recorded in the task report. This snapshot did not run `--check` or CI; that status is tracked at PR #340. |
| Actual-agent continuation | Verifier-owned consumer summary | Frozen isolated-install consumers, with actual artifacts/tool evidence separated from actor assertions; root native refresh and other hosts remain outside this proof. |

## Baseline evidence (not produced by this change)

A frozen installed-snapshot baseline consumer completed task-local `session-report` work without stage questions and wrote a proposal, but its machine outcome remained `workflow=session-report` with `recommended_next_workflow=retro-learn`; no settled successor run record was produced. Recorded at `.sdd/sdlc-workflow-continuation/consumer-baseline/artifacts/runs/continuation-report-probe/20261118T102849Z-session-report.json`. This is narrow baseline evidence, not a universal RED verdict or a quantitative claim; reading a successor body is not execution.

## Residual risks

- The metrics-first step only re-established the unchanged pre-feature baseline (`common` total `54106`); the feature's own resulting value is `54865`. It is not a general repair for changed aggregates or configurations and grants no ownership. The strict adoption independently proved the retained local base `15048dd24…` for this feature.
- This snapshot did not run `--check`, tests, or CI; authoritative later status is tracked at PR #340. Because `15048dd242bd1eadf825b680e7085d75abef0148` is a local producer reference absent in fresh clones, those checks must run against the final PR revision. Other hosts and overnight persistence remain not assessed.
- Actual-consumer observations apply only to the exercised frozen local installation and exact cases; no static check, model-written receipt, or successful lookup proves general host enforcement.
- No merge, deploy, release, or runtime activation was performed.
