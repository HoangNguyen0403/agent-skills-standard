# Implementation Walkthrough Evidence: Provider-Neutral Delegation

slug: provider-neutral-delegation
baseline_commit: a2228857e4cf5b8ee2d71d96630c586618ec2edd
requirements: [PRD](../prd/prd-provider-neutral-delegation.md)
design: [SRS](srs-provider-neutral-delegation.md)
plan: [Delivery plan](../plans/provider-neutral-delegation.md)
execution_ledger: [evidence archive](../../artifacts/provider-neutral-delegation/evidence/MANIFEST.json)
working_copies: `.agent/sdd/provider-neutral-delegation/` and `.agents/sdd/provider-neutral-delegation/` (git-ignored; historical only)

Scope of this document: observed repository-local results for REQ-1–REQ-10. It
does not certify native host behavior, permission enforcement, release or
activation. Native qualification and matched repeated trials require separate
account, budget and runtime authorization and remain unverified.

## Completed slices (source settled)

- **Delivery (D1)**: MCP skill requests return complete matched bodies read at
  request time; process-global suppression, omitted-body stubs and the
  `force_reload` option are removed. The ledger separates `selected` ids,
  returned bodies (`loaded`), repeat-inclusive `bodyReturnCount` and per-body
  SHA-256 digests, and reports no deduplicated-body savings.
- **Packets (D2)**: `task_brief.py` requires a versioned assignment manifest and
  publishes one standalone packet covering authority, invariants, owner, owned
  paths, ACs, verification, required standards, source/dependency digests,
  workspace containment and limits. Duplicate or missing task headings, `Task
  0` support, fenced pseudo-headings, stale digests, traversal and symlink
  escape are validated before publication.
- **Semantic policy (D3)**: `common-subagent-driven-development` names seven
  provider-neutral operations with host binding, an explicitly gated inline
  exception, packet-first worker bootstrap, disjoint ownership batching and
  failure-specific recovery. `implement-feature`, `review-ticket`,
  `common-task-complexity-routing` and `common-context-optimization` follow the
  same contract.
- **Export truthfulness (D3/D5 seam)**: capability entries declare delegation
  surface kind plus stable surface id; `delegationStatus` requires retained live
  execution evidence for the exact host/surface/version/operation. Copilot
  specialists are `.github/agents/<name>.agent.md`; Codex no longer projects an
  ineffective `sandbox_mode`; unsupported controls are disclosed.
- **Workflow catalog (D4)**: canonical `.agents/workflows/<name>.md` is installed
  once per configured provider and native exports derive from the same content.
  `.skills-lock.json` carries a validated, atomically written `workflowCatalog`;
  incomplete acquisition suppresses pruning and retains prior provenance; MCP
  lookup reports `managed`, `local_source`, `unverified` or `unavailable`.
- **Evidence (D5)**: session journals model `cancelled` attempts, declared
  `taskId`/`parentTaskId` labels and `expectedActors`; eval runs persist
  per-attempt `taskUsage`; report rendering withholds savings without complete
  actor coverage, metering, pricing and task identity; ambiguous reasoning
  billing yields unavailable cost instead of double billing.
- **Routing precision (D5/REQ-10)**: `profile` → `profiling`, delimiter-qualified
  `-form`/`-view` composite patterns, removed mobile `page` collision, and a bare
  `subagent` trigger for the SDD policy.

## Requirement trace and acceptance status

Legend: **observed** = orchestrator ran the command and observed the result;
**source-settled** = implementation exists and focused tests were staged but the
final gate has not run; **corrective-open** = a review finding is still being
corrected; **unavailable** = the required evidence does not exist.

| Requirement | Acceptance groups | Status | Observed evidence / gap |
| --- | --- | --- | --- |
| REQ-1 Deliver standards | AC-1.a–d | observed | Independent approval after Task 3 delivery corrections; 16 SDK/HTTP/telemetry tests PASS. A real MCP SDK client against the actual registry returned the repeated body twice with `force_reload` absent and no operator-profile collision (receipt `task-3-sdk-smoke-receipt.json`). Shared-HTTP sibling cases cover cross-context delivery. This is an in-memory SDK transport result, not native host propagation or acknowledgment. |
| REQ-2 Preserve assignment | AC-2.a–d | observed | Final independent approval after a bounded resolver correction; 29 packet and 13 review-package regressions PASS, and an actual approved-plan packet (`task-2-3b277f2a0616.md`) was generated and read back with complete authority, invariants and Task 2 text only. Path checks are local `realpath`/containment validation, not a sandbox or a race-free guarantee against a concurrent path swap. |
| REQ-3 Bind host operations | AC-3.a–c | repo contract verified; AC-3.a unavailable | Seven semantic operations, five declared native surfaces and per-operation support status are implemented and independently approved (Task 5, 72 tests). No two-host receipt comparison exists, so AC-3.a stays unverified; every native status remains `not_verified` without traces. |
| REQ-4 Govern recovery | AC-4.a–d | source-settled | Recovery table and eval scenarios cover retry-only premium refusal, missing prerequisite vs exhaustion, corrective AC naming and human escalation. No model-executed scenario run. |
| REQ-5 Verify native support | AC-5.a–c | repo contract verified; native unavailable | Static export shapes, projection rules and support-status logic are implemented and independently approved (Task 5, all findings closed, 72 tests PASS). No live discovery, invocation or denial trace exists, so all surfaces stay `not_verified`; Copilot nesting is not claimed. Installed binaries were observed by version only (codex 0.163.0, Claude Code 2.1.289, Gemini 0.45.0). |
| REQ-6 Bound lifecycle/acceptance | AC-6.a–f | source-settled; AC-6.d recovery verified | Resume keeps task/authority; cancellation and timeout are non-completion; independent review is required and separate; the inline exception is explicitly host-gated. AC-6.d was exercised for real: the generator's legacy `.agent` → `.agents` migration moved the SDD working directory and printed `Migrated and cleaned up old .agent folder.`; missing files were restored without overwrite (51 copied, 2 identical reused, 2 differing reports retained in both locations), and final reports, receipts and the newest review packages were archived under `artifacts/provider-neutral-delegation/evidence/` with SHA-256 pairs. Independent approval is recorded for Tasks 1–7. |
| REQ-7 Measure economics | AC-7.a–d | observed, independently approved | Independent final approval recorded (46 harness cases). Deterministic suites: 40 MCP, 37 root, `test:evals` 89, full MCP 236. The actual CLI retained a cancelled attempt in its `task-a`/`task-root` cohort with 10 uncached-input and 5 output tokens, listed the missing review actor by label, reported `complete: false` and `cost: null`, and exposed no raw session id. `--qualification-only --claim` returned one `not_verified` / `provenance: fixture` row with no probe or model call. The regenerated `evals:report` includes Task Economics with savings withheld. No matched trials exist, so no savings claim is made. |
| REQ-8 Discover workflows | AC-8.a–b | observed, independently approved | Independent approval recorded for the catalog, including the cleanup correction: 139 CLI tests and 18 uninstall tests PASS, with the earlier 135 CLI / 55 MCP gate and a real consumer-install smoke receipt. Lookup distinguishes managed, local-source, unverified and unavailable; no cross-layer fallback. |
| REQ-9 Publish consistent exports | AC-9.a–c | observed; stale-wrapper correction verified on disk | `pnpm generate-indices` regenerates 26 framework indices, 26 category `_INDEX.md` files, root router, rule files, `skills/README.md`, 33 workflows per configured target, 88 skills and 21 specialists. A parent CLI gate then exposed one stale checked-in wrapper (`implement-feature` parity, 1331 PASS / 1 FAIL): the wrappers had no lock ownership, so `force: []` preserved them silently. The generator now forces only deterministic export paths derived from canonical workflow names and declared agent formats; the six affected wrappers (`implement-feature`, `review-ticket` × Copilot/Codex/Claude) were regenerated with backups under `.ags/backups/20261023-060813/`, and the final full CLI suite then passed **1332/1332 across 66 files**, including checked-in wrapper parity. After review, the force boundary was tightened: the generator rejects any invocation whose CWD realpath differs from the authoring repository root (before any index/write), and no `.agents/workflows/**` path is ever forced — the canonical catalog, including the Antigravity/Kiro native destination, remains authored source; an equal-bytes native export needs no write. The footer now sets a nonzero exit code, and the foreign-CWD smoke passes: exit `1` with the authoring-root diagnostic, `consumerUnchanged: true`, `watchedAuthoringFilesUnchanged: true` (`generator-boundary-smoke-receipt.json`). A normal run then passed with 26 frameworks, 33 workflows, 88 skills and 21 specialists across configured surfaces, kept the active SDD workspace, and `WorkflowTransformer` (43 tests) plus `docs:capabilities:check` passed after the guard. A real-repository managed workflow lookup returned `managed` with `nativeParity: true` and digest `96b71bb86d234d36fffb662f3ac1b8ce3e8c7f1d9294e0731cd131bd668911cc` (`installed-workflow-smoke-receipt.json`) — that is managed-export parity, not native host execution. `.skillsrc` selection is unchanged; rollback identity is the baseline commit above. Publication does not imply host activation. |
| REQ-10 Minimize bootstrap | AC-10.a–c | observed | Routing suite observed 73/73 GREEN with independent review approval. Bootstrap policy is settled and the required-body delivery path is REQ-1's. No catalog-wide false-positive claim is made from the repaired cases. |

## Independent review verdicts

All eight task verdicts are **APPROVE**: Task 1 policy, Task 2 packets (29/13 +
smoke), Task 3 delivery (16 + SDK smoke), Task 4 catalog (139 + 18 uninstall),
Task 5 exports (72), Task 6 routing (73), Task 7 lifecycle/economics (46 harness,
40 MCP, 89 evals), and Task 8 integration/exports/recovery on
`review-ee2a93e157bd-b98add47d328` (both force boundaries and the
`exitCode = 1` terminal behavior closed). The relayed verdict text is archived at
[final-review-verdicts.md](../../artifacts/provider-neutral-delegation/evidence/final-review-verdicts.md).
It is textual acceptance evidence, not an authenticated identity, human approval or
host attestation. Approval covers repository implementation; native host
qualification and savings remain unverified.

Session audit/cost receipt (`session-audit-cost.json`): compliance audit performed
against the connected MCP process (27 loaded skills; generic Next.js/React
coverage warnings do not apply here), monetary cost and savings `unavailable`
for missing actor/attempt usage and billing rates, and the connected process's
pre-change omission/dedup text excluded from evidence. No host activation or MCP
restart occurred.

## Verification evidence

Orchestrator-executed prerequisites and focused lanes (not re-run for this
document; details in [verification receipts](../../.agent/sdd/provider-neutral-delegation/verification-receipts.md)):

```text
pnpm install --frozen-lockfile --ignore-scripts   # completed, no lifecycle scripts
python3 scripts/skill-tests/common-subagent-driven-development/test_task_brief.py   # 29 PASS + approved-plan packet smoke
python3 scripts/skill-tests/common-subagent-driven-development/test_review_package.py  # 13 PASS
python3 scripts/skill-tests/test_sdd_progress.py
pnpm --filter ./mcp test test/Tools.spec.ts test/http-transport.spec.ts test/skill-delivery.spec.ts  # 16 PASS (SDK/http/telemetry)
pnpm --filter ./mcp test test/SkillIndex.spec.ts                                   # 73/73 PASS
pnpm --filter ./cli test <catalog suites> && pnpm --filter ./mcp test test/WorkflowIndex.spec.ts  # corrected: 135 CLI + 55 MCP PASS
pnpm --filter ./cli test <capability/specialist suites>                            # 3 files / 65 tests PASS
pnpm test:evals                                                                    # 89 PASS
pnpm --filter ./mcp sessions:report --manifest <synthetic manifest> --json         # cancelled attempt retained; missing actor labelled
pnpm harness:smoke -- --qualification-only --claim <synthetic claim>               # one not_verified / fixture row, no probes
pnpm evals:report                                                                  # Task Economics section, savings withheld
shasum -a 256 -c .agent/sdd/pre-generate-hashes.txt                                # selected packet 3b277f2a…66bc + recovery receipt eaa3eca1…4b61f unchanged after every generation
find .agent/sdd/provider-neutral-delegation -type f | wc -l                        # 59 before and after
pnpm generate-indices                                                              # run 4 (post-guard): 26 frameworks, 33 workflows, 88 skills, 21 specialists; kept active .agent/sdd
WorkflowTransformer suite                                                          # 43 PASS after guard
foreign-CWD smoke (rtk proxy node /tmp/ags-generator-boundary-smoke.mjs)           # exit 1; consumer + watched authoring files unchanged
pnpm docs:capabilities                                                             # capability table rewritten with delegation columns
pnpm --filter ./mcp test                                                           # full MCP: 236 PASS
pnpm --filter ./mcp build                                                          # MCP bundle PASS
pnpm --filter ./mcp exec tsc --noEmit --strict                                     # MCP strict type check PASS
pnpm --filter ./mcp format:check                                                   # PASS after 4 formatter fixes
pnpm --filter ./cli test                                                           # full CLI: 1332/1332 PASS (66 files), wrapper parity included
pnpm docs:capabilities:check                                                       # PASS
pnpm check-alignment                                                               # PASS at 70% threshold; 3 existing warnings (87/86/83), lexical only
lint (CLI + MCP)                                                                   # PASS
pnpm build                                                                         # CLI build PASS
# product-evidence suite: 85 PASS; evals: 89 PASS
```

Known limits of the final gate (do not overstate):

- Whole-CLI strict type checking fails in **16 existing, unrelated construct
  diagnostics**: `Mcp`/`Uninstall`/`Upgrade`/`Verify` commands, `HookService` and
  `GitService` dynamic imports, `ConfigService` cast, `SyncService`
  `Promise.withResolvers`/`withMetadata`, and interop rule arity. This is not a
  claim that the baseline compiler was reproduced; the 7 untouched files show an
  empty `git diff` against BASE, and the `SyncService` constructs were also
  read-confirmed on BASE. All diagnostics introduced by this change set were
  fixed; the repo is not claimed full-CLI type-clean.
- CLI format keeps 2 existing warnings in `IndexGeneratorService.spec` and
  `OwnershipWriter.spec`; both have an empty `git diff` against BASE and are not
  restyled.
- `check-alignment` is a lexical eval-alignment check, not export parity, native
  capability or runtime proof.
- Managed workflow lookup smoke (real repo): `managed`, `nativeParity: true`,
  digest `96b71bb86d234d36fffb662f3ac1b8ce3e8c7f1d9294e0731cd131bd668911cc`
  (`installed-workflow-smoke-receipt.json`). This is managed-export byte parity,
  not native host execution.
- Foreign-CWD boundary smoke: **PASS** — exit `1` with the authoring-root
  diagnostic; `consumerUnchanged: true` and `watchedAuthoringFilesUnchanged: true`
  (`generator-boundary-smoke-receipt.json`). This is an authorization-boundary
  observation, not a data-loss or native-runtime claim.
- Source edits in this task are limited to `scripts/generate-indices.ts`; no
  activation, merge, release or paid trials were performed.

Receipts: `task-2-3b277f2a0616.md`, `task-2-smoke-receipt.json`,
`task-3-sdk-smoke-receipt.json`, `task-7-offline-smoke-receipt.json`,
`generator-boundary-smoke-receipt.json`, `installed-workflow-smoke-receipt.json`,
`evidence-recovery-receipt.json`, `verification-receipts.md` and
`MANIFEST.json` in
[artifacts/provider-neutral-delegation/evidence](../../artifacts/provider-neutral-delegation/evidence/).
Git-ignored working copies under `.agent/sdd` and `.agents/sdd` are historical
and are not the handoff reference.

Limits of this evidence:

- Realpath/symlink containment checks validate local paths before publication.
  They are not a sandbox and do not prove freedom from concurrent path swaps.
- The MCP delivery smoke used an in-memory SDK transport plus shared-HTTP
  regression fixtures. It does not prove remote transport, host propagation,
  model comprehension or authentication.
- No native host/model invocation, permission-denial scenario or matched
  repeated trial was executed. Native support and monetary savings remain
  unavailable claims.
- No command establishes native-host delegation, permission enforcement or
  monetary savings; file-level managed/native export parity and checked-in
  wrapper parity are separately observed above. `pnpm check-alignment` is a
  lexical eval-alignment check, not an export or runtime proof.

## Remaining acceptance work (outside repository implementation)

Repository implementation is verified and independently approved (Tasks 1–8).
Remaining items are explicitly gated and do not weaken the documented behavior:

1. Native qualification (discovery, bounded invocation, denial controls) on
   pinned host versions, per surface, with retained traces.
2. Matched repeated baseline/current task-class trials under an approved
   resource cap; report accepted outcomes, false positives, retries, latency and
   usage coverage. Missing usage withholds savings.
3. Maintainer release/activation decision. Repository publication is not host
   activation.
4. Legacy edited `.github/copilot-agents/` residue remains preserved beside
   `.github/agents/*.agent.md`; it is disclosed, not certified as runtime
   behavior.
5. Known carry-overs are not claimed clean: whole-CLI strict typing has 16
   existing unrelated construct diagnostics, CLI format has 2 existing warnings,
   and `check-alignment` is lexical (3 historical warnings).

feature_status: implementation_verified_native_qualification_pending
completed_evidence: source-settled D1–D5 implementation; focused deterministic regressions plus actual packet/MCP SDK/offline-journal smokes; native mirrors, indices and capability docs regenerated from settled sources with SDD evidence preserved; full CLI 1332/1332 (66 files, wrapper parity), full MCP 236, MCP bundle + strict type + format check, CLI/MCP lint, CLI build, docs:capabilities:check, check-alignment (lexical), eval 89 and product-evidence 85 observed; foreign-CWD guard smoke exit 1 with unchanged consumer/authoring files; post-guard normal generator run PASS; managed/native export parity observed with digest 96b71bb8…911cc; packet 3b277f2a…66bc and recovery receipt eaa3eca1…4b61f unchanged across runs; independent Task 1–8 approvals; AC-6.d recovery executed with durable archived evidence; session compliance audit performed with cost unavailable
missing_evidence: native-host qualification and denial traces; matched repeated task-class trials; billing-complete actor/attempt usage; release/activation approval
recommended_next_workflow: verify-work for native qualification when separately authorized
