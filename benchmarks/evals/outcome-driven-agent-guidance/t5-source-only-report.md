# T5 source-only generation and local consumer delivery — FINAL

Status: **DONE_SOURCE_ONLY** — staged generation, canonical/export parity, ownership verification and local consumer discovery passed inside the authorized worktree. Live efficacy, caller association, publication, release and activation remain NOT RUN/not performed. This delivery runs under the operator's explicit source-only waiver recorded by the parent in PRD §12 and `status.md`; that waiver removes live qualification as a prerequisite for staged generated outputs, not the status distinctions below.

- Worktree: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/illegal-platypus`
- Base revision: `c679e0032fbebf4eed90db0f2fc4f52541a3f23d`
- Entrypoint: `pnpm generate-indices` → `scripts/generation/index.ts` → `runIsolatedGeneration` (`scripts/generation/isolated-stage.ts`). No second helper, no inner `scripts/generate-indices.ts` invocation, no dependency install, no lock edit by hand.
- Authority: parent T5 brief plus the explicit source-only approval; no paid evaluation, provider call, safety probe, publication, merge or activation authority.

## Source identity (pre-run, bound before any generation)

Captured after the parent's approval bookkeeping and re-verified unchanged after all runs:
`artifacts/t5-source-only/preflight/pre-source-hashes.json`,
`artifacts/t5-source-only/evidence/post-source-hashes.json`,
`artifacts/t5-source-only/evidence/source-identity-check.json` (13 source files, 45 protected evidence files, `.skillsrc`; `identical: true`).

| Canonical source | SHA-256 |
| --- | --- |
| `skills/flutter/flutter-cicd/SKILL.md` | `411050f5fd90e60baffaa2e777b6e086b5a9019f263d357932e8bbaae30a9009` |
| `mcp/src/tools/index.ts` | `5eaa6e912d35d94b039c1f43a4b7f97b415716fc505148876301ed23007d3636` |
| `mcp/src/server.ts` | `8954b69aa48c56c929df468d5d4ef55ebfaa4aa2d8937e5d96e132b42270c9ae` |
| `cli/src/services/IndexContentBuilder.ts` | `0aba97dab60abc19811a740b1d4dbd1b73418cfe0204301f4781dc0b20de9b91` |
| `mcp/test/SkillIndex.spec.ts` | `9dfd0150e0707889a40e5f082dc92b8e6b03a4ae36e3118fd59b7cf030c37521` |
| `skills/common/common-skill-creator/SKILL.md` | `dbe56fa9d09335b88ee121a27c074d6aeb8c3312dc97c796b23f4385a88a779f` |
| `skills/common/common-skill-creator/references/outcome-driven-guidance.md` (new) | `5bc5c3107815c29510fe4bb2cb472ccdfa6d7db41d45d7ab50ae8df767805efb` |
| `skills/common/common-skill-creator/evals/evals.json` | `6ba2142dd133db16195b86fb9863a74fd008a4adabf2eca4ac280abc954c3051` |
| `skills/common/common-workflow-writing/SKILL.md` | `2a87e5dd6ed78fcee8b032e07d857ba2af3b5800247e5d45327374eb46f0c02f` |
| `skills/common/common-workflow-writing/evals/evals.json` | `c7f31795008848622e18f47d161e8f196c27a5e549c62c3db7fd4c47d5bc47f5` |
| `skills/common/common-subagent-driven-development/references/templates.md` | `d81ae93a43c51d79af32aa4ce4ff631e30d4aa4260339a34d2331ad8028ce07e` |
| `.agents/workflows/implement-feature.md` | `48b57bfc6dd53ebbdfcde69679f0691bd31eb25b7c7b60eaafed16d7cddc8d93` |
| `AGENTS_LEARNING.md` | `cd0195ac66aaafc25c7996f97316037a38c12791b5f31a86c756bbbe185ec063` |

The T2/T3 hashes match their accepted reports. `evals/*.json` and `AGENTS_LEARNING.md` are canonical-only inputs; they are not mirrored package resources.

## Gate 1 — read-only inventory before apply

`rtk pnpm generate-indices --check` exited `1` with:

```text
Prepared generator outputs are stale; differing generated outputs lack trusted ownership or explicit base proof: skills/flutter/_INDEX.md, skills/metadata.json.
```

Receipt: `artifacts/t5-source-only/evidence/check-before-ownership-proof/receipt.json` (`status: FAILED`, `appliedFiles: []`). It reported exactly 21 staged out-of-date files:

- 16 skill-package mirror leaves: 3 changed packages × 4 hosts — `common-skill-creator/SKILL.md`, the new `common-skill-creator/references/outcome-driven-guidance.md`, `common-workflow-writing/SKILL.md`, `common-subagent-driven-development/references/templates.md`;
- 3 `implement-feature` wrappers: `.github/prompts/implement-feature.prompt.md`, `.codex/skills/implement-feature/SKILL.md`, `.claude/commands/implement-feature.md`;
- 2 generation-owned outputs: `skills/flutter/_INDEX.md` (keyword cell only), `skills/metadata.json` (token metrics only).

No unrelated owned delta and no retirement was staged. `skills/flutter/**` mirrors were not regenerated because Flutter is not selected in `.skillsrc`; no Flutter install or selection was added.

## Gate 2 — pinned-base ownership proof and apply

Because `.skills-lock.json` is gitignored and absent, the two generation-owned outputs had no trusted ownership. The production engine's explicit base-proof mode was used, not a forced write and not recovery:

```text
rtk pnpm generate-indices --adopt-base c679e0032fbebf4eed90db0f2fc4f52541a3f23d
```

Exit `0` in 31.1 s. Receipt (`artifacts/t5-source-only/evidence/apply-pinned-base-proof/receipt.json`):
`status: APPLIED`, `copiedBackFiles` = the 21 paths above + `.skills-lock.json`, `retiredFiles: []`, `retiredEntries: []`, `preservedOrphans: []`.

The engine's adoption record proves the pre-run bytes of all 17 existing changed outputs against the pinned-base producer before publication:
`artifacts/t5-source-only/evidence/apply-pinned-base-proof/adoption/proof.json`, plus the engine's pre-publication before-state copies. Log line:
`Pinned-base producer outputs reconstructed and verified for 17 paths at c679e0032fbebf4eed90db0f2fc4f52541a3f23d.` Adoption fails closed on any byte, Git-index, or metadata token-scope mismatch; it did not bypass a failed provenance check.

Post-apply, plain `--check` reported `.skills-lock.json` stale. Mechanism (inference from `isolated-stage.ts:4390-4455,3557-3652`, consistent with observed counts): adoption records ownership only for changed paths, so unchanged HEAD-matching CLI outputs had no entries; an ordinary run provenance-refreshes them. The reconcile run

```text
rtk pnpm generate-indices
```

exit `0` in 10.8 s, copied back only `.skills-lock.json` (`artifacts/t5-source-only/evidence/apply-manifest-reconcile/receipt.json`), with zero output-byte drift. Lock entries: `19 → 2437` CLI entries, 2 generation entries, 33 workflow catalog entries; every recorded digest equals disk bytes. Then:

```text
rtk pnpm generate-indices --check
✅ Isolated generation check passed
```

Exit `0` in 9.3 s (`artifacts/t5-source-only/evidence/check-settled/`). `.skills-lock.json` is gitignored, is not a delivery artifact, was produced by the engine with verified digests, and was neither hand-edited nor deleted.

## Delivered generated changes

17 modified + 4 new files; `retiredFiles`, `retiredEntries`, `preservedOrphans` all empty. Pre-existing untracked `docs/prd`, `docs/srs`, benchmark evidence and source edits remain untouched by generation.

| Class | Paths |
| --- | --- |
| Mirror `SKILL.md` | `.agents`, `.github`, `.codex`, `.claude` × `common/common-skill-creator`, `common/common-workflow-writing` |
| Mirror reference | `.agents`, `.github`, `.codex`, `.claude` × `common/common-subagent-driven-development/references/templates.md` |
| New mirror resource | `.agents`, `.github`, `.codex`, `.claude` × `common/common-skill-creator/references/outcome-driven-guidance.md` |
| Workflow wrappers | `.github/prompts/implement-feature.prompt.md`, `.codex/skills/implement-feature/SKILL.md`, `.claude/commands/implement-feature.md` |
| Canonical index | `skills/flutter/_INDEX.md` — only the `flutter-cicd` keyword cell: `ci, cd, pipeline, build, deploy, release, action, workflow` → `flutter cicd`; ID set unchanged |
| Metadata | `skills/metadata.json` — only `categories.common.token_metrics` and `categories.flutter.token_metrics` changed; all other fields deep-equal to `HEAD` |

`AGENTS.md`, `server/AGENTS.md`, `skills/index.json`, `skills/README.md`, `README.md`, `cli/README.md`, `docs/agent-capabilities.md` and every other category index were unchanged by the staged run.

## Parity and consumer evidence (settled state)

One narrow final command: `node --import tsx /tmp/t5-final-verify.mjs` (script outside the repo) → exit `0`, `SUMMARY indexes=51 resources=100 lockEntries=2439 failures=0`; 2602 `PASS`, 0 `FAIL`. Full output: `artifacts/t5-source-only/evidence/final-verification.txt`.

- **Category ID-set membership:** 51/51 exact. Canonical `skills/<category>/_INDEX.md` equals every on-disk registry skill; each configured host index equals the real `.skillsrc` selection (include/exclude semantics) for `typescript`, `common`, `product-management`, `quality-engineering`, `system-design`, `cybersecurity`. No malformed or duplicate rows.
- **Resource parity:** 100/100 bytes equal for every mirrored file of the three changed packages across four hosts, using the generator's mirrored-file selection (excludes `__pycache__`/`.pyc`).
- **Wrapper parity:** production `WorkflowTransformer` output for `prompt`, `skill`, `command` byte-equals the generated wrappers (8113 / 8644 / 8547 bytes).
- **Ownership manifest integrity:** 2439/2439 recorded CLI/generation entries match disk.
- **Real consumer, MCP in-memory:** `SkillIndex` over the generated first-host mirror `.github/skills` (no metadata sidecar) loads 7 categories; `create skill` → `common/common-skill-creator`; `write workflow` → `common/common-workflow-writing`; the new reference exists in the mirror, is linked from the mirrored `SKILL.md`, and equals canonical bytes.
- **Real consumer, `WorkflowIndex`:** `implement-feature` → `status: managed`, `nativeParity: true`, 0 parity issues; body carries `observable outcome`, `Resolve discoverable facts`, `repair boundary`; `listInstalledWorkflows` returns 33 including `implement-feature`. All four native bindings verified through the published catalog digests.
- **Source/evidence integrity:** 13 canonical sources, 45 protected evidence files and `.skillsrc` unchanged from pre-run capture.

## AC status

| Criterion | Status | Evidence / limit |
| --- | --- | --- |
| AC-13 (REQ-06) | **PASS for the source-only delivery scope** | 21 declared outputs generated in isolation; canonical/export parity, ID-set coverage and real consumer discovery pass; no unrelated owned output overwritten; no retirement. Live "approved qualified" input is waived by the operator for this delivery, not replaced by a qualification claim. |
| AC-14 (REQ-06) | **NOT RUN** | This report and `status.md` separate repository delivery from activation/release; independent documentation review remains with the reviewer. |

## Excluded limitations (unchanged)

- No live efficacy comparison, no caller-selection/AC-15 qualification, no AC-02/03–08 execution, no paid model/provider call, no safety probe.
- No publication, push, merge, release, deployment or activation. No consumer project was modified; "delivery" means the local generated repository surfaces plus in-memory consumer discovery.
- No repo-wide tests, build, lint or formatters were run. The consumer check uses the real MCP service modules through `tsx`, so no CLI build was necessary.
- No Flutter skill installation or selection; unselected-skill behavior is preserved.
- Pre-existing `skills/common/common-subagent-driven-development/scripts/__pycache__/*.pyc` are untracked/gitignored build artifacts of an earlier Python check. The generator excludes them by design; they were not mirrored, modified or deleted.

## Residual risks / reviewer focus

1. **Adoption usage.** `--adopt-base` was used because a gitignored lock was absent and two generation-owned outputs changed. It executed the engine's per-path pinned-base proof. PRD T5 forbids adoption *to bypass* provenance failures; this run did not bypass — the proof gate passed and would have refused a mismatch. Reviewer should confirm that reading.
2. **Lock completeness.** The first adoption run recorded only changed ownership; a second ordinary run completed the manifest without touching output bytes. A clean CI checkout without a lock computes `next: null` and passes `--check` as before.
3. **Unmeasured behavior.** Generated guidance is now byte-consistent and discoverable; whether it improves agent outcomes is still unmeasured, and `status.md`/execution evidence should keep saying so.
4. **No independent review yet.** This report is the implementation owner's account; independent review and any human acceptance/release decision remain separate.
