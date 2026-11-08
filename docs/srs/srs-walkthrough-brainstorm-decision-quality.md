# Walkthrough: Brainstorm Decision Quality

## Scope and verdict

**PARTIAL / IN-PROGRESS TECHNICAL VERIFICATION — human timing NOT RUN; independent review findings addressed in this revision.**

Approved work item: [PRD](../prd/prd-brainstorm-decision-quality.md), standard delivery, high SNC (S=2, N=1, C=2, total=5, tier=high), user-approved subagent-driven execution on 2026-11-07. Direction lane improvement for brainstorm intake decision quality.

Approved baseline SHA-256: `4be30dd1bfeb2cb8bef837425db6f7c91ef6c5b2f1df01d779b25528143ef78a` (retained original approved brief hash; identifier-normalization revision normalizes parser grammar IDs without reapproving or altering approved meaning).

## Delivered changes

- Canonical intake workflow (`.agents/workflows/brainstorm-feature.md`) and shared decision discipline (`skills/common/common-decision-discipline/SKILL.md`, `references/contract-template.md`, `references/brainstorm-review.md`): structured intent playback ("You said / I assumed"), consequential-only questions with open intent elicitation when genuinely unknown, selective analysis without forced divergence, compact approval card (≤250 words) with explicit over-cap risk disclosure, pre-approval planner check for consequential guesses, and explicit scoped approval binding.
- Behavioral evaluation suite (`skills/common/common-decision-discipline/evals/evals.json`): 16 authored cases (8 categories) assessing intent fidelity, question discipline, recommendation challenge, review concision, planner check, approval integrity, and negative/counter-evidence handling; paired old/new run results are reported separately.
- Documentation and trace alignment: BRD contracts and PRD criteria normalized to parser-compatible canonical IDs `AC-001`..`AC-012` while preserving approved legacy aliases '01'..'07' / '02a'..'07b'.

## Acceptance evidence

Canonical criterion definitions remain in the PRD; this table records technical verification status.

| Criterion | Result | Accepted evidence |
| --- | --- | --- |
| [AC-001](../prd/prd-brainstorm-decision-quality.md) | Source reviewed; behavioral verification pending | Intent fidelity write-back distinguishes user goals from agent assumptions; concrete success example and anti-goal when ambiguous. Legacy alias '01'. |
| [AC-002](../prd/prd-brainstorm-decision-quality.md) | Source reviewed; behavioral verification pending | Research-first questions; never re-asks settled facts. Legacy alias '02a'. |
| [AC-003](../prd/prd-brainstorm-decision-quality.md) | Source reviewed; behavioral verification pending | Open consequential intent question when intent is genuinely unknown without steering to invented motives. Legacy alias '02b'. |
| [AC-004](../prd/prd-brainstorm-decision-quality.md) | Source reviewed; behavioral verification pending | Prioritizes single highest-impact unresolved decision; batches max 3 independent. Legacy alias '02c'. |
| [AC-005](../prd/prd-brainstorm-decision-quality.md) | Source reviewed; behavioral verification pending | No forced divergence or fabricated alternatives for clear requests / single viable paths; generation precedes critique. Legacy alias '03a'. |
| [AC-006](../prd/prd-brainstorm-decision-quality.md) | Source reviewed; behavioral verification pending | Recommendations expose strongest objection and reversal conditions; retained options state evidence limits and trade-offs. Legacy alias '03b'. |
| [AC-007](../prd/prd-brainstorm-decision-quality.md) | Observed FAIL before correction (463 words, repeated sections); installed-consumer retries then observed 290 words and, on the fixed package, 266 words (248 excluding two metadata lines) with no repeated sections or machine payload and "Reply ok or corrections" present. Marginal miss: NOT PASS. In the round-3 paired run, revised answers were 88-524 words; 11A (~260-word card) exceeded the cap without naming an over-cap risk. | Compact approval card contract (≤250 words) with explicit over-cap risk surfacing without dumping detail into chat. Evidence is local and not committed (see Residual risks): attempts 3 and 4 raw outputs and `paired-run-round3/`. Legacy alias '04'. |
| [AC-008](../prd/prd-brainstorm-decision-quality.md) | Source reviewed; behavioral verification pending | Pre-approval planner check resolves consequential guesses from evidence or exposes owner/scope; delegates minor builder choices; tier-proportional checking. Legacy alias '05'. |
| [AC-009](../prd/prd-brainstorm-decision-quality.md) | Observed FAIL before correction; fixed package observed PASS in the installed-consumer retry (attempt 4) and in the round-3 paired run (no revised answer granted planning authority or marked a pending brief `requirements_ready`; prior package: 11B proceeded to planning under assumed-autonomous, a critical veto) | Pending briefs use not_started (or preserve existing lifecycle) and never grant execution authority or requirements_ready. Legacy alias '06a'. |
| [AC-010](../prd/prd-brainstorm-decision-quality.md) | Source reviewed; behavioral verification pending | Material changes reopen only affected approval while preserving source-revision references. Legacy alias '06b'. |
| [AC-011](../prd/prd-brainstorm-decision-quality.md) | PARTIAL. Model-graded blinded paired runs DONE (8 scenarios, prior vs revised, same model, isolated). Round 3 (current source): revised preferred in 7, tie in 1, prior in 0; critical vetoes prior 3, revised 0; obligations revised 23 PASS / 10 FAIL, prior 9 PASS / 27 FAIL. Human timing and human corrections NOT RUN. | Observed improvements: no invented numbers in any revised answer; Proof line present in 1A, 5B, 10A, 13A; pending-approval gates held. Observed residual faults (not fixed): criteria the caller did not state stay unmarked `(assumed)` in 4 of 8 revised answers; one revised card ~260 words with no over-cap risk named and an unsupported "Independent check completed" claim; one invented brief filename. Caveats: single runs, one model family, one model grader, our own rubric; not statistical evidence; does not show users decide faster. Legacy alias '07a'. |
| [AC-012](../prd/prd-brainstorm-decision-quality.md) | PASS (technical): consumer-smoke-v2 on final bytes, 204 checks / 0 failures; local provenance (resolvedCommit null); VMO independent review round 1 CHANGES REQUESTED, findings fixed; independent re-review of the final package NOT RUN | Consumer smoke: disposable consumer sync, native export parity, MCP discovery; installed-skill invocations observed (attempts 2-4 graded). True host slash dispatch NOT RUN (Claude OAuth expired, Gemini unauthenticated, Codex limit until Nov 13). Legacy alias '07b'. |

## Actual checks and boundaries

| Check | Observed result | Boundary |
| --- | --- | --- |
| `rtk pnpm audit:sdlc` | PASS | Re-run on the final source and regenerated surface (workflow 78 lines). |
| Outcome templates | PASS | `rtk pnpm audit:outcome --templates --json`, 0 issues, on the final source. |
| Eval preflight | PASS | Validates eval preflight 0 issues (`rtk pnpm evals:preflight -- --skills-file .agent/sdd/brainstorm-eval-selection.txt`). |
| CLI suite | PASS | Full CLI suite passes: 81 files, 1887 tests passed (`rtk pnpm --filter ./cli test`; extra `--` flag forwarded to full CLI suite rather than targeted spec). |
| `test:generation` | TIMEOUT (180s) | `test:generation` timed out at 180s; no suite PASS claimed; bounded regression used. |
| Bounded tests | PASS | 2 configured-workflow-missing-source regression test cases ran and passed via `rtk proxy node --import tsx --test --test-name-pattern='workflow catalog\|configured workflow\|workflow.*deselection\|workflows.*canonical' scripts/generation/isolated-stage.test.ts`. |
| Live efficacy / human timing | Model-graded paired runs DONE; human timing NOT RUN | Two blinded model-graded paired runs recorded; maintainer timing packet prepared, not filled. No human timing baseline exists. |
| Consumer / integrated review | VMO round 1 findings fixed; no re-review of the final package | Disposable consumer smoke PASS recorded under AC-012. |

## Residual risks and boundary

- Technical checks are partially verified; no final PASS is claimed.
- Human review timing (≤2 minutes target) and comparative correction rates remain unmeasured and require empirical evaluation.
- No package publication, merge, deployment, or runtime activation has been performed.
- Evidence archives (`artifacts/`, `.agent/sdd/`) are gitignored and are not part of this change; they exist only on the authoring machine.
