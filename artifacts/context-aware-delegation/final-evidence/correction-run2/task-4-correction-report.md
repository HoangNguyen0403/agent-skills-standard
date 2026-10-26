# Task 4 correction report (run2): host category index discovery rows

- Task: Task 4 integration correction after independent Task 5 review finding
- Finding: MAJOR — AC-19 (generated exports reflect accepted canonical source) / exported AC-18 (model-tier/effort discovery)
- Reviewer artifact (preserved verbatim before any reviewer overwrite): `artifacts/context-aware-delegation/final-evidence/history/task-5-review-run1.md`, SHA-256 `500398c0b0dd787085746ac503febd3e58f5ebc0439a5831f3f41171cfc1eb41`
- Source revision: `92d06c420f6a41f08e11579423e4e3eacdb7880d`
- Terminal state: **correction completed in the repository**; independent recheck and final acceptance are not claimed or self-approved.
- Constraints held: no hand-edited index, no source1/2/3 edit, no generator-code edit, no lockfile copy-back, no commits, no paid/live evaluation, no recursive delegation. Tests/lint/build/formatters skipped as instructed; parent reruns covering gates.

## Observed defect

At run1 completion, each of the four configured host indices (`.agents`, `.github`, `.codex`, `.claude` → `skills/common/_INDEX.md`) held **43 rows** and omitted `common-subagent-driven-development` and `common-task-complexity-routing`. Canonical `skills/common/_INDEX.md` held 45 rows including both. Skill resource bytes matched on all four hosts, so the earlier parity check passed while discovery semantics were broken.

## Cause (from lifecycle source, not assumption)

1. The run1 scratch stage deleted the two mirror package directories **and** the four host `common/_INDEX.md` files before generation.
2. `scripts/generate-indices.ts:323` runs `applyIndices` **before** `beginInstall` (`:395`) and `writeSkills` (`:451`). With the packages absent, that pass generated the host indices from an **incomplete inventory** and wrote them as `added`.
3. `writeSkills` then restored the two packages.
4. `completeInstall(refreshIndices)` (`:459`) recomputed complete index content, but `OwnershipWriter.write` (`cli/src/services/install/OwnershipWriter.ts:79-117`) classifies against `opts.previous` only — the dispatch-time lockfile, empty in the stage — and never against its own `next` record. The existing, differing, non-owned index therefore hit the `unknown` branch and was **left untouched**.
5. Root `skills/common/_INDEX.md` was unaffected because it is written directly from the canonical `skills/` tree (`fs.writeFile`), not through the ownership writer, so it always saw the complete inventory.

Root cause in one line: **indices were bootstrapped from a deliberately incomplete mirror inventory, and the ownership writer cannot overwrite its own earlier unowned write in the same run.**

## Correction sequence (run2)

1. Fresh scratch stage `/private/tmp/cad-task4-correction.80tjp5vp` created from the current complete checkout: both accepted mirror packages already present and correct.
2. Inventory precondition asserted before generation: every canonical common skill ID is present in each host mirror (no gaps).
3. Only the four host `common/_INDEX.md` files removed in the stage. **No mirror package was deleted**; `.agents/workflows` (canonical) untouched.
4. `rtk proxy node --import tsx scripts/generate-indices.ts` → exit 0; `generate-capabilities-doc.ts` → exit 0. Logs: `correction-run2/run2-generate-indices.log`, `correction-run2/run2-generate-capabilities.log`; provenance in `correction-run2/run2-stage-run.json`.
5. Semantic assertion over the staged output for all 45 expected installed common IDs per host, both target IDs, and the four model/effort discovery terms (`model routing`, `llm model selection`, `thinking level`, `reasoning effort`).
6. Guarded allowlisted copy-back: 4 files copied, 68 already identical, 0 skipped; destination pre-hash and stage inventory preconditions enforced; packet supersession recorded explicitly (run1 had already replaced those four paths).
7. Verification pass: 72/72 owned paths identical to the stage; canonical→mirror resource parity unchanged; all four host indices byte-identical to each other.

## Paths and digests

| Path | Before (run1) | After (run2) |
| --- | --- | --- |
| `.agents/skills/common/_INDEX.md` | `5fafa11e55553dd104896e39b332cf27bd1f9c75607e174da28108d1a9863463` | `636a5ef6fd77b59b5e371537665ca8037f93424ef01463a80609cda42e6ed684` |
| `.github/skills/common/_INDEX.md` | `5fafa11e…` | `636a5ef6…` |
| `.codex/skills/common/_INDEX.md` | `5fafa11e…` | `636a5ef6…` |
| `.claude/skills/common/_INDEX.md` | `5fafa11e…` | `636a5ef6…` |
| `skills/common/_INDEX.md` (canonical, unchanged) | `636a5ef6…` | `636a5ef6…` |

After correction each host index contains 45/45 expected skill IDs with no unexpected rows, both target IDs, and all four discovery terms; the four host files are byte-identical to the canonical common index. Full per-file digests: `correction-run2/copy-back-receipt-run2.json`; post-state: `correction-run2/copy-back-verify-run2.json`; stage inventory: `correction-run2/stage-vs-active-run2.json`.

Only these four files changed in this correction. No other owned path changed; unowned stage drift (`__pycache__`, `.skills-lock.json`) was not copied.

## Evidence preservation

- Run1 evidence is byte-intact: root `final-evidence/MANIFEST.json` (22 entries), root `STATUS.json`, `copy-back-receipt-run1.json`, `copy-back-verify.json`, generation logs, `stage-run.json`, `stage-vs-active.json`, and the three acceptance receipts.
- Two helper scripts (`copy-back.py`, `stage-diff.py`) were extended during run2 (inventory path, superseded-packet flags, stage-prefix guard, output-path argument). The extended versions are preserved under distinct names (`correction-run2/copy-back-run2.py`, `correction-run2/stage-diff-run2.py`), and the **exact run1 bytes were restored** at the original `final-evidence/` paths: `copy-back.py` SHA-256 `a52e92ee986fbc6cd130c8459b8fde495c3f26afa8ce3e16aa5957db82b229bd`, `stage-diff.py` SHA-256 `41a1f02857fe54391bf3d9e5c03b5815499c771a8c638b0305d2a81fc0c7b3b9`. Both match their original manifest entries, so all 22 root artifact hashes verify again. No receipt, log, status or manifest file was rewritten.
- Reviewer artifact preserved as `history/task-5-review-run1.md` with its SHA before any later overwrite.
- `.agent/sdd` pre-generate hash list: 49/50 unchanged; the one changed file is the parent-owned `prepare-final-review.py`, updated by the parent, not by this task. Inventory grew by 27 known additive parent records (final-check logs/results, review packages, review brief, `final-smoke.ts`, `index-discovery-smoke.py`, etc.) plus this task's `task-4-report.md` and this correction report. No file removed.
- Old blocked checkpoint `artifacts/context-aware-delegation/evidence/` untouched.

## Checks

| Check | Result |
| --- | --- |
| `generate-indices` (run2 stage) | exit 0 |
| `generate-capabilities-doc` (run2 stage) | exit 0 |
| Semantic index proof (45 IDs/host, targets, discovery terms) | pass |
| Copy-back digest preconditions + post-copy equality | pass, 4/4 |
| Owned parity after copy | pass, 72/72 |
| Original run1 manifest entries (22) | pass, 22/22 after helper restoration |
| Correction manifest entries | pass, all digests match |
| `pnpm validate`, `test:evals`, `evals:audit`, `check-alignment`, `audit:*`, `docs:capabilities:check`, MCP/Python suites | `not_run` here — parent's versioned rerun owns the covering gate |

## Residual risk

The run1 verification gap was methodological: equality of resource bytes and cross-host consistency does not prove category-index coverage. The correction asserts ID-set equality against the canonical inventory; future regeneration should keep that assertion. No activation, enforcement or savings claim is made; final acceptance remains with the independent reviewer.
