# T6 integration report — 2026-10-26

## Disposition

T6 staging, attributable copy-back, preservation checks, no-model gates, lexical matrix and real CLI consumer sync/verify are complete. Final independent T6 review is pending. No model run, semantic efficacy, realized ROI, human acceptance, T7, T4 activation, remote CI, commit, push or release is claimed.

## Frozen inputs and preservation

- Base commit: `92d06c420f6a41f08e11579423e4e3eacdb7880d`.
- Accepted canonical source freeze: 10 files; all 10 SHA-256 values in `accepted-source-freeze.json` matched live bytes after integration.
- T5 revision 4: independent acceptance review says APPROVE and binds eight artifacts. All eight digests were recorded in the staged generation receipt; the seven canonical packet/eval files and the matrix source were checked again. Matrix source digest: `a97fe9397f22b49ff4e38e31a8ded326d8dbfa2045279b55360e0abf77db3549`.
- `pnpm-lock.yaml` remained `04e6837b729cda90c048bf26984ce3a69f7124b6e323c82f606a4963acab1bef`.
- Historical baseline comparison: **6,262 files / 9,708,487 bytes** under `benchmarks/**`, `benchmark-report.md`, and `evals-report.md` remained byte-identical to their immutable baseline snapshots. The complete preservation receipt is included below. Existing historical benchmark corpus bytes were not copied into this evidence bundle.
- External pre-generation evidence archive: `/Users/nguyenhuyhoang/.ags-evidence/backend-system-design-roi-improvement/t6-frozen-inputs-20261026T174353Z.tar.gz`, 636,416 bytes, SHA-256 `26f2bd5d9cbe20b41064d5d71a828421797e98b573ff824777d862ebe0df5168`. The associated manifest binds the archived source/review packets and records the original failed reviews. The SDD tree count and digest in the stage receipt were identical before/after generation (6,450 files; `8da933e1525cf2b986d866c2629682ebabaa5bd6893ccb9f6415bc1d213d67ad`).
- The lead-owned `AGENTS_LEARNING.md` Iteration 26 append is intentional and outside T6 copy-back. It was preserved and is included in the final file inventory; no earlier learning entries were overwritten.
- The observed SHA of `T5-acceptance-review.md` is `ca36ec82a937404804d289d6152c27f791d5d469adec9b4c38135029c018125d`; this differs from the lead notification shorthand `8995f3ec…2884`. The review content says APPROVE and binds the same eight artifact hashes. The digest discrepancy is retained as a receipt note, not silently reconciled.

## Staged generation and copy-back

Stage physical realpath: `/private/var/folders/bk/6qfpqsgs4vj31vdb4b0yq_f80000gp/T/ags-roi-t6-RkWXR3/candidate`, outside the active checkout. The stage was prepared from the frozen candidate; canonical input hashes and T5 artifact hashes were checked before generator execution. Active `.agent/sdd` evidence was not exposed to generators.

Dependency provenance: `node_modules` was linked to the active checkout. The stage runner copied `cli/node_modules` and `mcp/node_modules` into the disposable stage rather than linking those two child dependency directories; they came from the already-installed frozen-lock worktree. Generator execution used the root linked `tsx` binary. The lockfile stayed unchanged. This differs from the preferred all-local-dependency-links setup and is recorded as a process deviation; it did not change active dependencies or source bytes.

Commands, each exit 0, run in the stage:

| Command | Exit | Observed result |
| --- | ---: | --- |
| `rtk node_modules/.bin/tsx scripts/generate-indices.ts` | 0 | Generator reported indices for 26 frameworks, category indices and README; full install lifecycle also wrote unrelated workflow/specialist/rule outputs **in staging only**. |
| `rtk node_modules/.bin/tsx scripts/calculate-tokens.ts` | 0 | Recomputed category token metrics. |
| `rtk node_modules/.bin/tsx scripts/generate-capabilities-doc.ts` | 0 | `Wrote docs/agent-capabilities.md`; bytes matched the active destination, so no copy-back. |

The generator's full stdout/stderr and exact exits are retained in the JSON command receipts. Copy-back used individual files only, after each active destination matched its captured pre-stage SHA-256; each post-copy digest matched the staged output. **45 files copied**: 40 source mirrors, four agent-specific category indices, and `skills/system-design/_INDEX.md`. The four category indices were verified against staged output digests (they are agent-specific and are not byte-identical to the canonical category index). All 40 exported skill resource files are byte-identical to canonical source. Evals were not exported; the four canonical eval files remain T5-owned. No active lockfile, `.ags/`, workflow, rule or unrelated generator output was copied.

`skills/metadata.json` was merged narrowly: only `categories.system-design.last_updated` (`2026-10-26`) and `token_metrics` changed; version remained `1.2.4`, and all other category token metrics were unchanged. Token approximation follows `scripts/calculate-tokens.ts` (`ceil(UTF-16 characters / 4)`): system-design category body tokens moved **15,657 → 16,813 (+1,156)**. Across the four changed packages, body tokens moved **4,432 → 5,588 (+1,156)**. Lazy-load references are separate: **9,575 → 19,038 (+9,463)** total reference tokens, including the two new references. These are context-size estimates, not measured savings or usage.

| Package | Body tokens (baseline → current; Δ) | Lazy-reference tokens (baseline → current; Δ) |
| --- | ---: | ---: |
| `system-design-building-blocks` | 970 → 1,280; +310 | 1,463 → 3,711; +2,248 |
| `system-design-resilience-ops` | 1,109 → 1,453; +344 | 2,154 → 3,743; +1,589 |
| `system-design-data-architecture` | 1,389 → 1,667; +278 | 4,751 → 7,933; +3,182 |
| `system-design-integration-patterns` | 964 → 1,188; +224 | 1,207 → 3,651; +2,444 |

The package-level figures and per-reference file breakdown are in `receipts/token-delta.json`.

Unchanged authorized shared destinations were not copied: `skills/index.json`, `skills/README.md`, `README.md`, `cli/README.md`, `docs/agent-capabilities.md`, and `AGENTS.md`. `ARCHITECTURE.md` and `CONTRIBUTING.md` remain unchanged because this change did not alter registry or installation architecture.

## No-model gates and smoke

| Command / scenario | Exit | Result |
| --- | ---: | --- |
| `rtk pnpm --filter ./cli build` | 0 | Vite built `cli/dist/index.js` (441.00 kB; 111.43 kB gzip). Existing Vite config-loader warning shown; build succeeded. |
| `rtk pnpm --filter ./cli validate:all` | 0 | 336 passed, 0 failed; 56 warnings. |
| `rtk pnpm audit:skills` (isolated stage) | 0 | `No obvious redundancy found.` Its generated audit output remained in stage. |
| `rtk pnpm audit:keywords` | 0 | 134 cross-category collision warnings; no system-design collision section was emitted. Warnings were not silently treated as failures or repaired. |
| `rtk pnpm check-alignment` | 0 | All skills meet 70% threshold; two unrelated <90% warnings were reported (`flutter-getx-navigation` 86%, `swift-best-practices` 83%). |
| `rtk pnpm evals:preflight -- --skills-file benchmarks/evals/backend-system-design-roi-skills.txt` (isolated stage) | 0 | 0 issues. `eval-preflight.json` was written only in stage. |
| `rtk pnpm test:evals` | 0 | 89 tests; 89 pass, 0 fail, 0 skipped. Tooling tests only; not skill efficacy. |
| `rtk pnpm docs:capabilities:check` | 0 | `docs/agent-capabilities.md is up to date.` |
| `rtk node --import tsx .agent/sdd/backend-system-design-roi-improvement/T5/lexical-candidate-matrix.ts` | 0 | Four targeted lexical probes matched expectations; 0 mismatches. Lane A fully accepted 1/54 calibration pairs (26/126 assertions); not semantic evidence. |
| Real CLI consumer smoke: `sync` then `verify --agent antigravity` with a loopback-only registry fixture and disposable HOME/XDG | 0/0 | Installed exactly the four selected packages; 13 installed package resource files matched canonical fixture bytes, including both new references; 43 fixture requests, 0 eval requests; `verify` checked 15 tracked files and reported all match. No MCP runtime config was written; telemetry was disabled. Candidate base commit `92d06c…`, dirty candidate snapshot SHA-256 `bdfaa34569866c0fcc9a58098272b883f49b50bc4570007c1738715fcd7c657a`.

The successful CLI `sync` emitted `fatal: not a git repository` on stderr because the disposable consumer project is not a Git checkout; it still exited 0, synced the selected package payload, and passed `verify`. This is retained as a diagnostic, not represented as clean stderr.

## Corrected preparation/verification attempts

- Initial stage-runner assertion and a `pnpm`/Corepack invocation failed before any generator ran; the assertion was corrected and Corepack's isolated-HOME bootstrap was avoided by invoking the already-installed local `tsx` binary directly. No source, lockfile or historical report changed from those attempts.
- The first mirror parity checker incorrectly expected agent-specific category `_INDEX.md` files to equal the canonical index. It was corrected to compare those outputs with the staged generator hashes; all 40 source-resource mirrors and four staged index digests then passed. No output was altered to satisfy the checker.
- An initial consumer smoke used `sync --yes`; that CLI option re-prompts for consent when MCP is disabled and wrote only to the disposable consumer directory. The fixture was cleaned. The final smoke uses non-interactive `sync` without `--yes`, asserts no MCP write, and passed. No MCP server was invoked and no external network was used; registry requests were intercepted by the loopback fixture.
- After helper cleanup, a final attempt to rerun `rtk node .agent/sdd/backend-system-design-roi-improvement/T6/publish-evidence.mjs` exited 1 (`MODULE_NOT_FOUND`) because the temporary publisher had already been removed. No evidence file was changed by that failed command; the updated `T6-report.md` SHA-256 was then applied to its manifest entry directly and recorded.
- The T5 matrix is lexical calibration only. The L1/L2 semantic lanes and L3 executable candidate-app harness were not run. No model calls were made.

## Changed paths and acceptance

- Canonical source/eval changes remain owned by T1–T3/T5 and are frozen; T6 did not edit them.
- T6 copy-back: 45 generated outputs above plus scoped `skills/metadata.json`.
- T6 documentation: `CHANGELOG.md` and `docs/prd/prd-backend-system-design-roi-improvement.md`.
- Lead-owned intentional change outside T6 lock: appended Iteration 26 in `AGENTS_LEARNING.md`; preserved without edits.
- No `ARCHITECTURE.md`, `CONTRIBUTING.md`, `.skills-lock.json`, provider policy, workflow, rule, or unrelated generated path change by T6.
- AC-ROI-15: **satisfied for repository distribution integration** — all four packages are selected, 40 resource mirrors match canonical source, four indices match staged output hashes, and the real CLI consumer installed only the four packages. This does not establish semantic efficacy.
- AC-ROI-16: **satisfied for checked preservation scope** — all 6,262 pre-existing benchmark/report files checked against baseline, accepted source/T5 hashes and lockfile matched, and SDD tree digest/count were stable across staged generation. Historical content was not overwritten by audit/preflight.

## Remaining gates and cost

Final independent T6 integration review, human acceptance, exact T7 authorization, executable efficacy lane, paid pilot and release remain pending/not authorized. Remote CI was not run. Total account/provider/coordinator/reviewer cost is **unknown**, not zero; canceled/rejected attempts and orchestration/review overhead are not fully metered here. No cost-saving claim is made from worker routing or this repository integration.
