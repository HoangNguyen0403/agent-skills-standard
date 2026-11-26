# T5 corrective report — installed associated-concept headers

Status: **DONE_SOURCE_ONLY — user-authorized pinned-base apply completed** (see "Status update — user-authorized apply" at the end; the earlier refusal record is preserved below verbatim).

Historical pre-apply status: **BLOCKED_BEFORE_APPLY** — the bounded four-string source fix was staged in `cli/src/services/IndexGeneratorServiceImpl.ts`; the production generator refused publication on ownership provenance for generation-owned category/root outputs. No generated output and no `.skills-lock.json` was written. Per the frozen brief, execution stopped at that refusal without adoption, recovery, force, or lock work. A later explicit user authorization resolved it for this correction only.

- Worktree: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/illegal-platypus`
- Base revision: `c679e0032fbebf4eed90db0f2fc4f52541a3f23d`
- Frozen packet: `benchmarks/evals/outcome-driven-agent-guidance/t5-correction-brief.md`, SHA-256 `4331f01aa5c34186c3b225e737d8a3b0649f7fc77130af2586a80e22333c03ac`
- Authority: this corrective assignment plus the unchanged source-only operator approval. No model/provider call, test, lint, formatter, commit, publication, release, activation or delegation.

## Source change (only authorized source path)

`cli/src/services/IndexGeneratorServiceImpl.ts`

- Before: `9e0fa76f687a291f45ea66a4355afa27c5fbd9e1da40a0da03e263c72cf540fe`
- After: `37f3894201914570d8fb82beaaa623fdc650ce9c3a56d74fd476e2878942d3e5`

Exactly four shared strings changed; signatures, logic, row generation and all other output are untouched.

```text
234  ## Keyword Match (associated concepts in requested work)
236  | Skill | Associated concept |
408     - **Keyword Match**: associate the concepts in the user's requested work; literal wording need not appear.
419  > [!TIP] **Associated concepts, atomic values.** Supply the requested work as one atomic keyword value, e.g. `keywords: ["flutter cicd"]`; do not split it into separate tokens or treat unrelated, background, or quoted mentions as requested intent. Indirect intent still counts ("make it faster" -> performance, "broken query" -> database, "login flow" -> auth); registry matching is literal and does not infer relationships.
```

The root tip keeps useful indirect-intent normalization while stating that registry matching is literal and does not infer relationships or merge background/quoted mentions into requested intent.

## Command and exact refusal

Preserved evidence: `artifacts/t5-correction/evidence/check-refused/receipt.json`,
`artifacts/t5-correction/evidence/check-refused/generation.log` (bounded copies; evidence root is gitignored).
Original attempt: `/private/var/folders/bk/6qfpqsgs4vj31vdb4b0yq_f80000gp/T/ags-generation-check-attempt-2026-11-26T03-02-16-615Z-34371d`.

```text
rtk pnpm generate-indices --check
exit 1
Prepared generator outputs are stale; differing generated outputs lack trusted ownership or explicit base proof:
AGENTS.md, server/AGENTS.md, skills/angular/_INDEX.md, skills/common/_INDEX.md,
skills/cybersecurity/_INDEX.md, skills/dart/_INDEX.md, skills/database/_INDEX.md,
skills/golang/_INDEX.md, skills/ios/_INDEX.md, skills/java/_INDEX.md,
skills/javascript/_INDEX.md, skills/kotlin/_INDEX.md, skills/marketing/_INDEX.md,
skills/php/_INDEX.md, skills/product-management/_INDEX.md, skills/python/_INDEX.md,
skills/quality-engineering/_INDEX.md, skills/react-native/_INDEX.md, skills/react/_INDEX.md,
skills/specialists/_INDEX.md, skills/swift/_INDEX.md, skills/system-design/_INDEX.md,
skills/typescript/_INDEX.md.
```

Receipt: `checkOnly: true`, `status: FAILED`, `appliedFiles: []`, `verifiedFiles: []`, `retiredFiles: []`, `restoredRetirements: []`, `publicationCommitted: false`, 43 staged out-of-date files. No apply was run.

## Staged inventory (43 paths, all inside the frozen semantic header scope)

- 21 canonical `skills/<category>/_INDEX.md` whose keyword section embeds the changed heading/column;
- `AGENTS.md`, `server/AGENTS.md` (root/server router instructions embed the keyword rule and tip);
- 20 configured-host category indexes (`.github`, `.agents`, `.codex`, `.claude` × `common`, `cybersecurity`, `quality-engineering`, `system-design`, `typescript`).

No package `SKILL.md`, reference, script, asset, workflow wrapper, `skills/metadata.json`, selected-category, parser/runtime/MCP-tool or retirement path appeared. `flutter` and `product-management` host indexes are absent because those pages have no keyword-match section; `CLAUDE.md` and the configured rule files do not embed these four strings. No out-of-scope change was proposed, so no change was rejected on scope grounds.

Refused set = 23 generation-owned paths (21 canonical indexes + `AGENTS.md` + `server/AGENTS.md`). The other 20 are CLI-managed host indexes whose provenance refresh is permitted; they remain unwritten because publication is all-or-nothing.

Pre-run digests of every destination (unchanged after the refusal):

| Destination | SHA-256 before / after |
| --- | --- |
| `.agents/skills/common/_INDEX.md` | `fa452133278dde2638e764f3dec9efd285279c1791bacc5e11c630873b3b2478` |
| `.agents/skills/cybersecurity/_INDEX.md` | `80dbbd77eef41edac9e2efdeac23c91bcf224fa8fe606d8dc56028ffb7402f34` |
| `.agents/skills/quality-engineering/_INDEX.md` | `5d5a13691e186dc618f1d5b7b48a429835f53ff197d4f9d343f4309af959eb42` |
| `.agents/skills/system-design/_INDEX.md` | `e6b3df2163fdb295ccea8d217fb24a342d9c5b578471fdb92ba739ccc3c69a29` |
| `.agents/skills/typescript/_INDEX.md` | `3bcd6dcb1b2f3b58ec9884b1ce17beb4996603187fbdf1fee1c3927d6c341ddb` |
| `.claude/skills/common/_INDEX.md` | `fa452133278dde2638e764f3dec9efd285279c1791bacc5e11c630873b3b2478` |
| `.claude/skills/cybersecurity/_INDEX.md` | `80dbbd77eef41edac9e2efdeac23c91bcf224fa8fe606d8dc56028ffb7402f34` |
| `.claude/skills/quality-engineering/_INDEX.md` | `5d5a13691e186dc618f1d5b7b48a429835f53ff197d4f9d343f4309af959eb42` |
| `.claude/skills/system-design/_INDEX.md` | `e6b3df2163fdb295ccea8d217fb24a342d9c5b578471fdb92ba739ccc3c69a29` |
| `.claude/skills/typescript/_INDEX.md` | `3bcd6dcb1b2f3b58ec9884b1ce17beb4996603187fbdf1fee1c3927d6c341ddb` |
| `.codex/skills/common/_INDEX.md` | `fa452133278dde2638e764f3dec9efd285279c1791bacc5e11c630873b3b2478` |
| `.codex/skills/cybersecurity/_INDEX.md` | `80dbbd77eef41edac9e2efdeac23c91bcf224fa8fe606d8dc56028ffb7402f34` |
| `.codex/skills/quality-engineering/_INDEX.md` | `5d5a13691e186dc618f1d5b7b48a429835f53ff197d4f9d343f4309af959eb42` |
| `.codex/skills/system-design/_INDEX.md` | `e6b3df2163fdb295ccea8d217fb24a342d9c5b578471fdb92ba739ccc3c69a29` |
| `.codex/skills/typescript/_INDEX.md` | `3bcd6dcb1b2f3b58ec9884b1ce17beb4996603187fbdf1fee1c3927d6c341ddb` |
| `.github/skills/common/_INDEX.md` | `fa452133278dde2638e764f3dec9efd285279c1791bacc5e11c630873b3b2478` |
| `.github/skills/cybersecurity/_INDEX.md` | `80dbbd77eef41edac9e2efdeac23c91bcf224fa8fe606d8dc56028ffb7402f34` |
| `.github/skills/quality-engineering/_INDEX.md` | `5d5a13691e186dc618f1d5b7b48a429835f53ff197d4f9d343f4309af959eb42` |
| `.github/skills/system-design/_INDEX.md` | `e6b3df2163fdb295ccea8d217fb24a342d9c5b578471fdb92ba739ccc3c69a29` |
| `.github/skills/typescript/_INDEX.md` | `3bcd6dcb1b2f3b58ec9884b1ce17beb4996603187fbdf1fee1c3927d6c341ddb` |
| `AGENTS.md` | `bde0d9c085be097f9bf7d19e3e3cd2dd84077ccbea4f3c2d085253a78852e827` |
| `server/AGENTS.md` | `da9ab30561eaa7447e6419ef9cf73c742d78f040a272ad77558a227cdea8fdf0` |
| `skills/angular/_INDEX.md` | `fcea3c2ffc8765c9758900f2e1df1e4e23c0f3ede540e096a321d5dd9f6fa010` |
| `skills/common/_INDEX.md` | `fa452133278dde2638e764f3dec9efd285279c1791bacc5e11c630873b3b2478` |
| `skills/cybersecurity/_INDEX.md` | `80dbbd77eef41edac9e2efdeac23c91bcf224fa8fe606d8dc56028ffb7402f34` |
| `skills/dart/_INDEX.md` | `db61185535eb80d1a6a5d53463b8dacd9e02d3880ced307900a2beed20ccabff` |
| `skills/database/_INDEX.md` | `d23ed4474cf9d856687be33c17fa8ae14dc1a32660e78ec203102d17e350e06f` |
| `skills/golang/_INDEX.md` | `713badea2131ba74728752073ac0a192922e38c4328a96505c7830f0c6ef770b` |
| `skills/ios/_INDEX.md` | `83f216a3f908bcd33c7aa8dc959daa08c317867feb8985f7dd89b81116963913` |
| `skills/java/_INDEX.md` | `11e795c7debfe4a0cf29b0bb12081e3df0e81f9643984a5ebd3182606a0b3bf8` |
| `skills/javascript/_INDEX.md` | `9540d8613c04899a5faf503488f1d56f611f3327f75b82dd167ad8758a47b8a2` |
| `skills/kotlin/_INDEX.md` | `89091f11a020b1329dbc3a19be4391b23ea712c44be4acb6b9241cb997d78412` |
| `skills/marketing/_INDEX.md` | `9003d5e2542fb7b3024d2247b3c1d68986bc3a35318e2953650a9ef7bbd2c994` |
| `skills/php/_INDEX.md` | `db6c27f1d38549adca9b7c9b6f6dd59a64a4d14c83d2af012cf1ddd9c0300e79` |
| `skills/product-management/_INDEX.md` | `5ac281dd2d992adcd245471ab37739665579e88323f4cfde9866fdbd0d49fdf1` |
| `skills/python/_INDEX.md` | `b59f93be51cab5c0439461a50d3ff7bc6db69172676f32dd7260f1d2b0ff3958` |
| `skills/quality-engineering/_INDEX.md` | `5d5a13691e186dc618f1d5b7b48a429835f53ff197d4f9d343f4309af959eb42` |
| `skills/react-native/_INDEX.md` | `4311ce9a0169bbed9b1e17a968a8385baa8bfb2d087e77fec63b420e9404e0d1` |
| `skills/react/_INDEX.md` | `4d15c2a78e3e2703ff5f37b5020f0ea76335cf74fe55aa1c2d86f573bba7f76e` |
| `skills/specialists/_INDEX.md` | `357f351365a348f7734e60837bcb4af5d2f9af14d8e1821b1d9426e94e31010f` |
| `skills/swift/_INDEX.md` | `5352fba5565b84822294342dba59bab6904b9b11169d19b4e2689f8a71b831a8` |
| `skills/system-design/_INDEX.md` | `e6b3df2163fdb295ccea8d217fb24a342d9c5b578471fdb92ba739ccc3c69a29` |
| `skills/typescript/_INDEX.md` | `3bcd6dcb1b2f3b58ec9884b1ce17beb4996603187fbdf1fee1c3927d6c341ddb` |

## Why publication was refused

`.skills-lock.json` (hash `c237e69f813b60d4270ba8ed1d866533d131015d3c965cb4801b3f05f9342da1`, unchanged) has 2437 CLI ownership entries, 33 workflow-catalog entries, and only two generation entries: `skills/flutter/_INDEX.md` and `skills/metadata.json`. The 23 changed generation-owned paths above have no generation entry, so the engine classifies them as untrusted existing outputs; the frozen brief forbids `--adopt-base`, `--recover-provenance`, lock edits, and force.

**Missing input:** an authorized engine-owned provenance mechanism for these generation-owned header outputs (for example, pre-existing generation entries or a bounded base proof limited to these paths). The source fix and the inventory are ready; no generated delivery can occur until that authority exists.

## Stability and immutability

- 57 destination hashes, 47 protected evidence hashes and `.skillsrc` are unchanged after the attempt (`artifacts/t5-correction/preflight/pre-state.json`, `post-state.json`, `stability-check.json`).
- `.skills-lock.json` unchanged; prior `artifacts/t5-source-only` evidence manifest unchanged.
- No rollback or deletion. No generated output was written; installed `.github/skills/common/_INDEX.md:31,33` and `AGENTS.md:84` still carry the old strings.
- New evidence is bounded under `artifacts/t5-correction/` (gitignored) with `MANIFEST.json`; durable parent archive under `benchmarks/evals/outcome-driven-agent-guidance/t5-evidence` is pending final freeze.

## Prior report corrections (historical text preserved)

`t5-source-only-report.md` is unchanged. Its statements are corrected here, not erased:

1. "MCP in-memory" was direct `SkillIndex`/`WorkflowIndex` service calls, not an SDK `Client`/`InMemoryTransport` tool-transport test. The parent's SDK smoke is the transport-level evidence.
2. `--adopt-base` was outside the then-current delegated authority; its engine proof passing does not retroactively authorize it.

## Not run before the authorized apply / limitations at refusal time

- At refusal time: no apply, no `--adopt-base`, no `--recover-provenance`, no force, no lock edit, no second producer. The later user-authorized apply is recorded in the status update below.
- No parity/consumer run: generated outputs did not settle at the corrected bytes, so running them would only restate the old installed strings. The required generator check ran once and refused.
- Rendered installed headers could not be inspected because nothing was published; the source strings above are the exact production text, verifiable in the staged diff but not claimed as installed output.
- No independent review/approval is implied; this is worker evidence only.

## Status update — user-authorized apply

Authority: the user explicitly authorized, for this correction only, `rtk pnpm generate-indices --adopt-base c679e0032fbebf4eed90db0f2fc4f52541a3f23d`, scoped to the 43 reviewed header outputs plus the engine-owned `.skills-lock.json`. **This adoption is user-authorized.** The earlier T5 adoption remains an unauthorized process deviation; this grant does not retroactively authorize it. `--recover-provenance`, force, manual lock edit/deletion, second producer, other adoption runs, publication, release, commit and paid calls remained forbidden and were not used.

Command and result:

```text
rtk pnpm generate-indices --adopt-base c679e0032fbebf4eed90db0f2fc4f52541a3f23d
exit 0 (65.9 s)
status: APPLIED
copiedBackFiles: 44 = the 43 reviewed header outputs + .skills-lock.json
retiredFiles: []  retiredEntries: []  preservedOrphans: []
```

`copiedBackFiles` set-equals the refusal inventory plus the lock; no extra or missing path. Receipt: `artifacts/generation-logs/attempt-2026-11-26T03-42-57-334Z-233303/receipt.json` (SHA-256 `8d36e0d9b1b5ec6e42b73f48dc456e9829e8fc2c1cec99acf4e18a973534f61e`; bounded copy `t5-evidence/adoption-receipt.json`).

Settled check:

```text
rtk pnpm generate-indices --check
exit 0
✅ Isolated generation check passed: prepared outputs match declared targets.
```

Receipt: `/private/var/folders/bk/6qfpqsgs4vj31vdb4b0yq_f80000gp/T/ags-generation-check-attempt-2026-11-26T03-44-10-504Z-e7d2d9/receipt.json` (SHA-256 `269de8889c54ca6f74a35f187f1ae00441a5e2db78517bbfc0b0b0ff79d32aa6`; bounded copy `t5-evidence/settled-check-receipt.json`).

Narrow parity (one run, summary `t5-evidence/parity-summary.json`):

- Installed `.github/skills/common/_INDEX.md` carries `## Keyword Match (associated concepts in requested work)` and `| Skill | Associated concept |`; the old mention-only heading is absent.
- `AGENTS.md` carries `associate the concepts in the user's requested work; literal wording need not appear.` and the atomic `keywords: ["flutter cicd"]` tip with literal-matching wording; the old rule is absent.
- All 20 header mirrors (`.github`, `.agents`, `.codex`, `.claude` × 5 header categories) byte-equal their canonical `skills/<category>/_INDEX.md`.
- All 21 previously delivered T5 package/workflow outputs are byte-identical to their pre-adoption hashes; `skills/metadata.json` included.
- Exactly 43 status entries were added, all reviewed header outputs; `git diff --numstat` is 43 files, +86/−86, i.e. two replaced lines per file (heading + column, or rule + tip). No other delta.
- Source remained `37f3894201914570d8fb82beaaa623fdc650ce9c3a56d74fd476e2878942d3e5`; protected evidence/`.skillsrc` unchanged before report append.
- `.skills-lock.json` updated by the engine: `2437` CLI entries, `25` generation entries (2 prior + 23 adopted), SHA-256 as recorded in `MANIFEST.json`.

Bounded evidence is archived under `benchmarks/evals/outcome-driven-agent-guidance/t5-evidence/` (`MANIFEST.json`, adoption/settled-check/refusal receipts, parity summary). No stage trees or full logs copied.

Remaining limits: no independent review or approval is claimed; no live efficacy/caller qualification, publication, release, activation, commit or paid call; no MCP SDK transport smoke was run here (parent owns that separate evidence). Historical corrections to `t5-source-only-report.md` (direct-service characterization; earlier unauthorized adoption) remain in force and unedited.
