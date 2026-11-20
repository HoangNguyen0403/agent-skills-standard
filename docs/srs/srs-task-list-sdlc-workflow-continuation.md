# Tasks: SDLC Workflow-Wide Continuation

## Authority and Readiness

- Project/account domain: personal public `agent-skills-standard`; authorized workspace: current `old-frog` worktree.
- Original work item: `docs/brd/brd-sdlc-workflow-continuation.md`; stable slug `sdlc-workflow-continuation`; delivery_mode extended; snc_tier high; model_tier strong is an analysis hint, not premium authorization.
- Operator selected **A** in the immediately preceding implementation gate (reply `a`), approving the plan/design and Subagent-Driven repository implementation -> independent review -> verification. No merge, release, deployment, premium, new accounts, host configuration, or activation authority.
- Approved PRD SHA-256: `c6698b765eec40c73e9663642d666592f9cc55dacebc365c83e1d5ed7bf6ab12`.
- Approved SRS SHA-256: `a599039007d7744f8633333f6022ed2293ac771eb34ff0c0013d09963a4bd9c7`.
- BASE: `11c8bd1a72be5935bafbd45c63d8236baab804fb`. Initial dirty state: only the three task-specific BRD/PRD/SRS documents were untracked; preserve them.
- Placement: one worker owns the coupled shared contract/workflow integration, forced by the selected orchestration approach. Independent review and consumer verification are separate contexts. Do not split shared implementation ownership by workflow stage.
- Implementation profile: `Personal - DeepSeek` (`omp/river/deepseek-ai/DeepSeek-V4.1-Flash-1017`, write, low), the policy's current eligible Personal implementation route. No premium fallback.
- Prerequisite: frozen dependency install with scripts disabled completed successfully. `tsx`, Vitest and repository dependencies are available.
- Readiness: D1/D2 repository implementation READY under the recorded human approval and mapped criteria. D3 source/integration review can prepare; actual consumer qualification requires the exercised host/environment to be available and must never be inferred from text checks. Host restart/wakeup is excluded.
- Evidence lanes: technical not assessed; human acceptance not assessed; release not assessed. An approval/receipt is not host-authenticated enforcement.

### Task 1: Implement the shared continuation contract and all applicable delivery paths

**Files:** canonical `.agents/workflows/` (excluding internal-only `evals-run`); `skills/common/common-decision-discipline/`; relevant existing CLI workflow export/sync and MCP lookup tests; `skills/metadata.json`; `ARCHITECTURE.md`; `CONTRIBUTING.md`; `CHANGELOG.md`; `docs/sdlc-workflow-quick-reference.md`; task-specific walkthrough. Generated mirrors may change only through existing isolated generation, never manual edits.
**Scope / owned write set:** the literal bounded directories/files in the assignment manifest only. One owner for shared sources. Do not change approval controls, unrelated skills, packages, runtime configuration, test/eval engines, or internal-only distribution policy. Do not edit the approved BRD/PRD/SRS semantics.
**Inputs:** approved PRD/SRS and recorded source revisions above; existing `common-decision-discipline` semantics; existing `WorkflowTransformer`, `WorkflowSyncService`, and `getWorkflow`/`getSkill` delivery paths; exact standards in the manifest.
**Outputs:** compact normative continuation section in the returned common skill body; canonical entry/handoff instructions for all participating workflows; relevant behavioral eval cases and distinct integration regressions where needed; common/workflow metadata patch bumps; generated native exports with parity evidence; concise docs/changelog updates; FINAL worker report with changed files and observed evidence.
**Real Ingress:** invoke an individual installed workflow in autonomous mode with `auto_continue=true`; use the real export/install and MCP workflow/common-skill retrieval paths. A printed successor name or phrase-presence check does not demonstrate execution. Orchestrator owns fresh actual-consumer runs after source freeze.
**Invariants:**
- Positive: an authorized opted-in run executes the actual eligible successor, preserving work-item/scope/authority/stop conditions without a routine stage question.
- Negative: opt-out/interactive/absent-mode do not silently enable chaining; missing authority or prerequisites pause the affected action; null/terminal results finish; repeated unresolved states do not busy-loop; interrupted effects are reconciled, not replayed; child procedures return to their caller.
**Gate / rollback:** explicit run opt-in and approved task authority; control: no expanded approval, account, execution mode or host permission; rollback: revert; reversibility: revertible
**Verification owner:** implementer focused source/export checks via `rtk pnpm --filter ./cli exec vitest run src/services/utils/__tests__/WorkflowTransformer.spec.ts`; orchestrator actual-consumer and final covering checks; independent reviewer architecture/security/specification assessment. No blanket suite or paid eval invocation.
**Handoff / freeze:** write `.sdd/sdlc-workflow-continuation/task-1-report.md` marked FINAL, stop source edits, list every changed path, exact commands/raw-output evidence and limitations. Source freeze precedes independent review. Do not commit or spawn agents.
**Correction route:** one concrete corrective assignment for failed criteria; only then the next eligible implementation route for unresolved quality failure. Observed quota exhaustion advances immediately to the eligible fallback; invalid arguments/permissions do not count as exhaustion. No automatic premium.

- [ ] Snapshot the old common skill before editing; inspect existing consumer tests/evals and record baseline limits honestly.
- [ ] Implement the canonical self-contained contract and consistent direct-entry/handoff integration without a new runtime engine.
- [ ] Preserve special gates, actual branching/null outcomes, user opt-out and subprocedure ownership across the complete workflow inventory.
- [ ] Update version metadata and docs; regenerate only through existing isolated tooling without provenance bypass.
- [ ] Run focused checks after source changes settle; report exact outcomes, including any unavailable host evidence. No lexical checks masquerading as consumer proof.
- [ ] Freeze and hand off to orchestrator review/verification; no merge/deploy/activation.

## Verification Scope

Canonical criteria live once in the PRD, AC-001 through AC-021; technical mappings live in the SRS. Do not duplicate or weaken them here. Worker-owned checks prove distribution/structural behavior only where actually exercised. Fresh-consumer execution is required for run-behavior claims. Other hosts remain not assessed until exercised; overnight persistence remains outside scope.
