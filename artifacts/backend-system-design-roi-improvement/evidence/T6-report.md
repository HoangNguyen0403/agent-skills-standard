# T6 integration report — 2026-10-26

## Disposition

T6 staging, attributable copy-back, preservation checks, no-model gates, lexical matrix and real CLI consumer sync/verify are complete. Final independent T6 review is pending. No model run, semantic efficacy, realized ROI, human acceptance, T7, T4 activation, remote CI, commit, push or release is claimed.

## Frozen inputs and preservation

- Base commit: `92d06c420f6a41f08e11579423e4e3eacdb7880d`.
- Accepted canonical source freeze: 10 files; all 10 SHA-256 values in `accepted-source-freeze.json` matched live bytes after integration.
- T5 revision 4: independent acceptance review says APPROVE and binds eight artifacts. All eight digests were recorded in the staged generation receipt; the seven canonical packet/eval files and the matrix source were checked again. Matrix source digest: `a97fe9397f22b49ff4e38e31a8ded326d8dbfa2045279b55360e0abf77db3549`.
- `pnpm-lock.yaml` remained `04e6837b729cda90c048bf26984ce3a69f7124b6e323c82f606a4963acab1bef`.
- Historical baseline comparison: **6,262 files / 9,708,487 bytes** under `benchmarks/**`, `benchmark-report.md`, and `evals-report.md` remained byte-identical to their immutable baseline snapshots. The complete preservation receipt is included below. Existing historical benchmark corpus bytes were not copied into this evidence bundle.
 - External pre-generation evidence archive: `/Users/nguyenhuyhoang/.ags-evidence/backend-system-design-roi-improvement/t6-frozen-inputs-20261026T174353Z.tar.gz`, 636,416 bytes, SHA-256 `26f2bd5d9cbe20b41064d5d71a828421797e98b573ff824777d862ebe0df5168`. It binds the actual T5 acceptance-review digest `ca36ec82a937404804d289d6152c27f791d5d469adec9b4c38135029c018125d`; the notified shorthand `8995f3ec…2884` is unsupported by retained captures and is superseded, not evidence of tampering. The eight approved artifact hashes were independently recomputed and matched; see `receipts/final-review-reconciliation.md`.
 - Full T0 baseline archive: `/Users/nguyenhuyhoang/.ags-evidence/backend-system-design-roi-improvement/sdd-20261026T163623Z.tar.gz`, SHA-256 `100d946a753f9b8f973d8a3ecefa501c53c793872f7e1bf868a03fcc4f86be86`, 7,150 entries. The original corpus is not duplicated in this tracked evidence bundle; exact retrievable reference is also in `MANIFEST.json`.
 - The SDD tree count and digest in the stage receipt were identical before/after generation (6,450 files; `8da933e1525cf2b986d866c2629682ebabaa5bd6893ccb9f6415bc1d213d67ad`).
 - The lead-owned `AGENTS_LEARNING.md` Iteration 26 append is intentional and outside T6 copy-back. It was preserved and is included in the final file inventory; no earlier learning entries were overwritten.

## Staged generation and copy-back

Stage physical realpath: `/private/var/folders/bk/6qfpqsgs4vj31vdb4b0yq_f80000gp/T/ags-roi-t6-RkWXR3/candidate`, outside the active checkout. The stage was prepared from the frozen candidate; canonical input hashes and T5 artifact hashes were checked before generator execution. Active `.agent/sdd` evidence was not exposed to generators.

Dependency provenance: `node_modules` was linked to the active checkout. The stage runner copied `cli/node_modules` and `mcp/node_modules` into the disposable stage rather than linking those two child dependency directories; they came from the already-installed frozen-lock worktree. Generator execution used the root linked `tsx` binary. The lockfile stayed unchanged. This differs from the preferred all-local-dependency-links setup and is recorded as a process deviation; it did not change active dependencies or source bytes.

Commands, each exit 0, run in the stage:

| Command | Exit | Observed result |
| --- | ---: | --- |
| `rtk node_modules/.bin/tsx scripts/generate-indices.ts` | 0 | Generator reported indices for 26 frameworks, category indices and README; full install lifecycle also wrote unrelated workflow/specialist/rule outputs **in staging only**. |
| `rtk node_modules/.bin/tsx scripts/calculate-tokens.ts` | 0 | Recomputed category token metrics. |
| `rtk node_modules/.bin/tsx scripts/generate-capabilities-doc.ts` | 0 | `Wrote docs/agent-capabilities.md`; bytes matched the active destination, so no copy-back. |

The first copy-back contained 44 lead-approved generated allowlist paths (40 resource mirrors and four agent-specific category indexes) plus one scoped shared generated path, `skills/system-design/_INDEX.md`: 45 total. The initial four agent indexes had only 9 of 13 category skill rows; the previous stage-to-stage parity check was insufficient and its failed coverage is retained in `receipts/mirror-parity-initial.json` and `receipts/copyback-report-initial.json`. All 13 staged skills parsed, and desired-ID/ownership sets contained all 13. A code-consistent lifecycle risk is that the pre-install `applyIndices` pass runs before `beginInstall`/`writeSkills` using `PassthroughWriter`, while the later `OwnershipWriter` compares against the pre-run lock and may preserve a differing in-run bootstrap index as unknown. The exact bootstrap-time filesystem inventory was not retained; this mechanism is plausible but not proven as the exact cause of the 9-row result (which omitted exactly the four changed skills). No runtime generator code was changed. The bounded recovery removed only the four target host `_INDEX.md` files in staging, retained all 13 package directories, and reran the existing generator. All four regenerated indices now match the canonical full-category index SHA-256 `2486b5e4aca9c16df2f540b4524761deb2f45b206e5dcbe9650915d7bd7a9559`; 13 skill IDs and 138 frontmatter keywords were asserted, followed by guarded individual copy-back. Residual limitation: an unowned stale index may be preserved by the current writer lifecycle; the staged deletion is a bounded integration workaround, not a runtime-generator fix. Any production lifecycle correction is separate scope.

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
| `rtk pnpm audit:skills` (isolated stage; correction-only run) | 0 | `No obvious redundancy found.` Full stdout/stderr/exit is retained in `receipts/audit-skills-output.json`; no audit file was copied from stage. The former `audit-report.json` was a stale 2026-09-22 eval-audit snapshot with two unrelated database-hana errors; its unchanged bytes are now named `preexisting-eval-audit-snapshot.json` with provenance. |
| `rtk pnpm audit:keywords` | 0 | 134 cross-category collision warnings; no system-design collision section was emitted. Warnings were not silently treated as failures or repaired. |
| `rtk pnpm check-alignment` | 0 | All skills meet 70% threshold; two unrelated <90% warnings were reported (`flutter-getx-navigation` 86%, `swift-best-practices` 83%). |
| `rtk pnpm evals:preflight -- --skills-file benchmarks/evals/backend-system-design-roi-skills.txt` (isolated stage) | 0 | 0 issues. `eval-preflight.json` was written only in stage. |
| `rtk pnpm test:evals` | 0 | 89 tests; 89 pass, 0 fail, 0 skipped. Tooling tests only; not skill efficacy. |
| `rtk pnpm docs:capabilities:check` | 0 | `docs/agent-capabilities.md is up to date.` |
| `rtk node --import tsx .agent/sdd/backend-system-design-roi-improvement/T5/lexical-candidate-matrix.ts` | 0 | Four targeted lexical probes matched expectations; 0 mismatches. Lane A fully accepted 1/54 calibration pairs (26/126 assertions); not semantic evidence. |
| Focused real CLI consumer route smoke (corrected assertion receipt) | 0/0 | Loopback-only `sync` and `verify --agent antigravity`; actual consumer index `.agents/skills/system-design/_INDEX.md` SHA-256 `3ed604524ee9039b7e765cc81dd156125cdfeb485ee58cefbb0546f315c3a8c2` contains exactly the four selected route IDs and trigger rows matching their canonical selected rows; 71 fixture requests, 0 eval requests. `verify` checked 15 tracked files and reported all match. MCP was disabled in `.skillsrc`; telemetry disabled. Candidate base commit `92d06c…`, registry-tree snapshot SHA-256 `bdfaa34569866c0fcc9a58098272b883f49b50bc4570007c1738715fcd7c657a`. Separate earlier receipt `consumer-route-smoke.json` records 13/13 installed resource hashes matching canonical, including both new references (43 requests). |

The successful CLI `sync` emitted `fatal: not a git repository` on stderr because the disposable consumer project is not a Git checkout; it still exited 0, synced the selected package payload, and passed `verify`. This is retained as a diagnostic, not represented as clean stderr.

## Corrected preparation/verification attempts

- Initial stage-runner assertion and a `pnpm`/Corepack invocation failed before any generator ran; the assertion was corrected and Corepack's isolated-HOME bootstrap was avoided by invoking the already-installed local `tsx` binary directly. No source, lockfile or historical report changed from those attempts.
- The first mirror parity checker incorrectly expected agent-specific category `_INDEX.md` files to equal the canonical index. It was corrected to compare those outputs with the staged generator hashes; all 40 source-resource mirrors and four staged index digests then passed. No output was altered to satisfy the checker.
- An initial consumer smoke used `sync --yes`; that CLI option re-prompts for consent when MCP is disabled and wrote only to the disposable consumer directory. The fixture was cleaned. The final smoke uses non-interactive `sync` without `--yes`, asserts no MCP write, and passed. No MCP server was invoked and no external network was used; registry requests were intercepted by the loopback fixture.
- After helper cleanup, a final attempt to rerun `rtk node .agent/sdd/backend-system-design-roi-improvement/T6/publish-evidence.mjs` exited 1 (`MODULE_NOT_FOUND`) because the temporary publisher had already been removed. No evidence file was changed by that failed command; the updated `T6-report.md` SHA-256 was then applied to its manifest entry directly and recorded.
- The T5 matrix is lexical calibration only. The L1/L2 semantic lanes and L3 executable candidate-app harness were not run. No model calls were made.
## Final integration review corrections — 2026-10-27

- F1: The initial four host indexes had nine rows although the selected category has 13 skill IDs. The initial stage-parity receipt was not coverage proof and is preserved as historical. All 13 staged skills parsed, desired IDs/ownership had 13, and the 13-row/138-keyword host indices now match canonical. The pre-install bootstrap/ownership lifecycle is a plausible mechanism, not proven as the exact cause because the initial stage inventory was not retained; the omission asymmetry (exactly the four changed skills) remains unexplained. The bounded fix deleted only four stage target indices before rerunning the existing generator; this works without runtime code changes but leaves the unowned-stale-index lifecycle risk in place. A focused CLI consumer smoke verifies its actual `.agents/skills/system-design/_INDEX.md` hash, exactly four selected rows, and trigger equality. See `index-repair-generator.json`, `index-repair-copyback.json`, `mirror-parity.json`, and `consumer-route-smoke-rerun.json`.
- F2: The audit-shaped JSON formerly named `audit-report.json` was a historical eval-audit snapshot, not the `audit:skills` output. Its bytes and 2026-09-22 provenance are preserved under the historical name with a provenance record. A correction-only isolated-stage `audit:skills` run captured exact stdout/stderr/exit in `audit-skills-output.json`; no suite rerun.
- The T5 digest shorthand is resolved by the independent review as unsupported and superseded, not tampering. The actual eight-artifact APPROVE packet is bound at `ca36ec82a937404804d289d6152c27f791d5d469adec9b4c38135029c018125d`; exact rationale and archive binding are in `receipts/final-review-reconciliation.md`.
- The complete T0 archive path, SHA-256 and entry count are now explicit in both `MANIFEST.json` and `final-review-reconciliation.md`; the 11 MB baseline corpus remains external.
- Two focused-smoke harness attempts failed without establishing CLI failure: the first used `spawnSync` and blocked the fixture event loop (`consumer-route-smoke-attempt-1.json`); the next parsed rows as a bold list instead of the actual Markdown table (`consumer-route-smoke-rerun-attempt-1.json`). The parser was corrected to read table rows, and the third run passed with the generated consumer index bytes/hash and route assertions in `consumer-route-smoke-rerun.json`.


## Changed paths and acceptance

- Canonical source/eval changes remain owned by T1–T3/T5 and are frozen; T6 did not edit them.
- T6 copy-back: 44 lead-approved generated outputs plus one scoped shared canonical index (45 total), four-host category index correction as recorded in the receipts, and scoped `skills/metadata.json`.
- T6 documentation: `CHANGELOG.md` and `docs/prd/prd-backend-system-design-roi-improvement.md`.
- Lead-owned intentional change outside T6 lock: appended Iteration 26 in `AGENTS_LEARNING.md`; preserved without edits.
- No `ARCHITECTURE.md`, `CONTRIBUTING.md`, `.skills-lock.json`, provider policy, workflow, rule, or unrelated generated path change by T6.
- AC-ROI-15: **satisfied for repository distribution integration** — the full category routing index selects all 13 canonical skill IDs across four agent trees, with 138 keyword triggers checked against source frontmatter; all four host index files byte-match canonical SHA `2486b5e4…a9559`. The real CLI smoke selected the four changed packages and verified exactly their four consumer route rows plus every changed-package trigger. This does not establish semantic efficacy.
- AC-ROI-16: **satisfied for checked preservation scope** — all 6,262 pre-existing benchmark/report files checked against baseline, accepted source/T5 hashes and lockfile matched, and SDD tree digest/count were stable across staged generation. Historical content was not overwritten by audit/preflight.

## Remaining gates and cost

The independent final T6 re-review report is APPROVE for repository distribution integration only: `reviews/final-integration-review-rereview.md` (SHA-256 `965554fd6b1d167a24a444bf1cb156bea57c340d2b5b2a989950c6c59e619b87`). Its verdict binds the then-current 53-entry manifest; archiving this report adds a manifest entry and requires the requested digest-only recheck. Human acceptance, exact T7 authorization, executable efficacy lane, paid pilot and release remain pending/not authorized. Remote CI was not run. Total account/provider/coordinator/reviewer cost is **unknown**, not zero; canceled/rejected attempts and orchestration/review overhead are not fully metered here. No cost-saving claim is made from worker routing or this repository integration.
