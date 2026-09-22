# Implementation Walkthrough Evidence

## Completed slices

- Manifest v2: explicit scope, protocol, source hashes, collision-safe IDs, explicit resume, immutable inputs, typed compromised baselines.
- Scoring v2: complete-run gate, snapshot-backed assertions, `contains_any`/regex, case/assertion rates, trigger recall/specificity/balanced accuracy, and `n/a` compromised baseline/delta metrics.
- Compatibility: root scripts, CLI verifier, and MCP verifier agree on retained runs and aggregate answer paths.
- Reporting: aggregate runs project to category partitions; retained report is 22 categories and 265 unique skills.
- Eval quality: the catalog eval definitions pass the current audit and preflight gates; the canonical report covers 265 skills and the current remediation queue contains 55 strict-scope items.
- Cleanup: superseded v2.6.0 runs, archives, and history entries were removed after canonical verification. Only `all-v2.6.0` remains as the retained release artifact with its immutable snapshot, results, and verification evidence.

## Verification evidence

```text
pnpm test                         # CLI 781 tests + root eval tests 10/10
pnpm mcp:test                     # MCP 75 tests
pnpm build                        # CLI build passed
pnpm --filter ./mcp build         # MCP build passed
pnpm lint:check                   # CLI and MCP lint passed
pnpm audit:skills                 # passed
pnpm audit:sdlc                   # passed
pnpm check-alignment:strict       # all catalog skills >= 90%
pnpm benchmark:report             # report generated
pnpm evals:verify -- --all        # the retained canonical all-v2.6.0 run verified
```

Direct parity checks returned `ok: true` for the retained all/Dart runs and completed Dart v2 pilot runs from the CLI and MCP verifiers.

## Remaining acceptance evidence

The retained canonical run `all-v2.6.0` has a v2 manifest for 265 skills and 3,233/3,233 answer arms, zero compromised evidence records, and passes run-level plus `--all` verification. Its report measures 42% average baseline, 72% with-skill, +30% delta, and 96.88% balanced trigger accuracy. The 55-item remediation scope is represented by a verified 38-skill overlay with 38/38 changed skills passing the strict gate. The separate held-out trigger-paraphrase dataset named in the task list is not yet defined in this repository.

## Governed cybersecurity delivery — 2026-09-22

The sections above describe the earlier v2.6.0 remediation, not this change.
This delivery implements REQ-CYBER-001–008 from `srs-task-list.md`.

**Delivery status: draft PR; final behavioral acceptance blocked by provider
credits.** Four guidance corrections below passed structural checks but have
not completed a post-correction live run. Earlier scores do not certify them.

### Implemented and exercised

- Eleven opt-in cybersecurity skills cover shared authorization/evidence/mapping,
  white-team control/adjudication, red planning/scoped validation, blue
  triage/detection/hunting and purple detection validation. Three canonical
  workflows and native exports compose them without changing default installs.
- Sync downloads and installs supported package resources as bytes, preserves
  applicable attribution, respects package-local attribution and overrides,
  rejects unsafe paths and aborts incomplete assembly before writing a lockfile.
- Eval snapshots preserve raw skill/eval bytes and package resources. Root,
  CLI and MCP verification reject raw/parsed input divergence and byte tampering.
  Resource changes invalidate dependent evidence; legacy verification remains
  available without granting legacy snapshots whole-package promotion authority.
- Retrospective, learning-log, LLM-security and pentest guidance distinguish
  proposed changes, independent review, promotion and rollback; preserve
  blocked/not-tested findings; and gate live operations on authorization and
  demonstrated host enforcement.

### Verification commands and observations

All shell commands were invoked through `rtk`.

| Check | Observed result |
| --- | --- |
| `pnpm test` | 924 CLI + 43 root eval + 62 freshness tests passed |
| `pnpm mcp:test` | 97 tests passed |
| `pnpm test:e2e` | Built CLI E2E and validation passed; tracked temporary-project fixtures restored afterward |
| `pnpm build`, `pnpm mcp:build` | Both passed |
| `pnpm lint:check` | CLI/MCP passed |
| MCP `tsc --noEmit` | Passed |
| Package-native Prettier checks for changed CLI/MCP sources | Passed |
| Skill validation and `audit:skills` | All 317 skills passed structural validation |
| `audit:injection`, `audit:sdlc`, `check-alignment` | Passed their configured gates; injection audit retains an unrelated existing `.env`-reading warning and alignment retains two existing warnings |
| `verify:release-tags` | Passed for all 25 categories; no tag created |
| Selected 14-skill eval preflight | Zero issues |
| `benchmark:report` | Regenerated structural coverage, not a behavioral or efficacy certification |

A throwaway temporary-project smoke installed all eleven real cybersecurity
packages through the public writer, preserved root LICENSE and synthetic binary
bytes `ff 00 80 42`, removed a stale file, and generated an index with eleven
entries. The compiled `ags verify --agent codex` exited 0 before tampering and
exited 1 naming the changed asset after replacing `ff` with `fe`. The smoke
script and temporary project were removed after the observed pass.

Independent review identified and regression-tested three integrity faults:
lossy binary lockfile hashing; partial assembly silently dropping retained
packages from the lockfile; and mutable parsed assertions beside unchanged raw
hash strings. Review also found one real content gap: scoped validation could
invent a finding status or observation when its fixture was underspecified.
The contract now requires the existing status vocabulary and supplied evidence;
the fixture supplies concrete synthetic evidence rather than inviting invention.

### Existing repository limitations

- CLI `tsc --noEmit` still reports five existing errors in `McpCommand.spec.ts:428`,
  `UpgradeCommand.spec.ts:34`, `HookService.spec.ts:679`,
  `SyncService.spec.ts:999` and `ConfigService.ts:410`. The first four files/regions
  are pre-existing test typing/import issues; the last is an existing cast.
  These are not represented as passing checks.
- Full-repository formatting has unrelated existing failures; only changed
  CLI/MCP source formatting is asserted above.
- Catalog-wide eval audit still reports two single-assertion cases in
  `database-hana`. Selected cybersecurity/evolution preflight is clean; the full
  catalog preflight reports 43 existing issues outside the selected pack.
- An untracked, pre-existing `presentation-deck-builder-coverage-20260715`
  directory contains prompts but no manifest/results, so local `evals:verify
  --all` cannot pass. It is not included in this PR; retained completed runs are
  verified individually.
- No production exercise, SIEM deployment, authenticated approval service,
  independent held-out efficacy study, category release or benchmark promotion
  was performed. Typed reviewer names and hashes do not establish authority.

### Immutable live evaluation evidence

Runs used `gpt-5.6-luna`, high reasoning and four isolated workers. Delegated
implementation/review used Luna/Terra at medium/high settings; total billed
cost is unavailable from the runtime.

1. [`governed-cybersecurity-20260922-attribution`](../../benchmarks/evals/runs/governed-cybersecurity-20260922-attribution/results.json)
   retains the first 167 fresh answers. Its manifest did not activate guardrail
   execution, so it is **not** pressure-scenario evidence. It remains immutable.
2. [`all-v2.6.1-2026-09-22T07-28-44-830Z-0e7f8fb4`](../../benchmarks/evals/runs/all-v2.6.1-2026-09-22T07-28-44-830Z-0e7f8fb4/results.json)
   records explicit `guardrail: true` for all fourteen selected skills,
   221 completed answer arms, 115 newly generated answers and 106 compatible
   reused answers. Its baseline plan identifies reuse; this is incremental
   evidence, not a wholly fresh release sweep.

Both new runs and historical `all-v2.6.0` pass individual `evals:verify`.
The completed pressure-aware run has zero incomplete arms and zero compromised-skill records.
Its deterministic scores are **50/73 with-skill outcome/pressure cases**,
including **13/27 pressure cases**, and **75/75 trigger cases**. All fourteen
skills meet the trigger gate; only the three common evolution/security skills
meet the strict outcome gate. **None of the eleven cybersecurity skills is
represented as strict release-ready, and no promotion was performed.**

The retained results and transcripts expose every failed assertion. Many
residuals require exact prose such as `paired action and observation` or
`require explicit authorization`; passing artifact-integrity verification does
not turn those failed behavioral grades into passes. The approved delivery is
the opt-in capability, transport, evidence and governance implementation with
honest observed limits—not a claim of control efficacy or release certification.

### Final review corrections and external blocker

Review of failed arms found four substantive gaps in addition to phrase-matching
misses. The canonical guidance now requires:

- Both current authorization **and verified host scope enforcement** before
  live restart; an owner exception or proposed compensating controls cannot
  waive either. An explicit exception-pressure regression case was added.
- `accountable_owner: unassigned` plus a required assignment when the intake
  provides no owner; never fabricate a completed assignment.
- Preservation of the old versioned mapping and evidence when creating a
  replacement candidate for review.
- A safe offline alternative in every runtime-blocked validation response,
  without implying that live work or new collection occurred.

The attempted 2-skill regression run
`all-v2.6.1-2026-09-22T07-48-59-095Z-e19532eb` planned 17 fresh answers and
15 compatible reused answers, but Codex CLI stopped with:

```text
ERROR: Your workspace is out of credits. Add credits to continue.
```

It was not scored or promoted. Its incomplete artifacts were preserved outside
the repository at `/tmp/ags-credit-blocked-all-v2.6.1-2026-09-22T07-48-59-095Z-e19532eb`,
not committed as completed evidence. Source fixes also cover the other two
reviewed skills. After credits are restored, regenerate a baseline plan from
the last completed 14-skill run so all four changed packages are included:

```sh
rtk proxy env EVALS_CONCURRENCY=4 EVALS_MODEL=gpt-5.6-luna \
  EVALS_REASONING_EFFORT=high pnpm evals:baseline -- \
  --baseline all-v2.6.1-2026-09-22T07-28-44-830Z-0e7f8fb4 --execute
```

Then verify the resulting run and independently review remaining behavioral
residuals before declaring acceptance. Do not reinterpret source inspection,
code tests, a reviewer name, or preserved old scores as fresh model evidence.
