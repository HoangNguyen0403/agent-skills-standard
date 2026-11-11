# Review: Brainstorm and Research Quality Historical Inspection and Evaluation Preparation

## 1. Executive Summary and Scope

This document records the bounded preparation delivered for the Brainstorm Direction and Research Quality initiative: the Evaluation Preparation Kit (T2a) and a document-only history inspection (T1). It makes no claim of behavioural efficacy, model output, or evaluation spend.

- **Authoritative provenance**:
  - Approved BRD (unchanged): `docs/brd/brd-brainstorm-research-quality.md` (current file SHA-256 `2cf486c168f41f66f127b1f9a5bb6cf1b0d2f55ca9c5d451aece9be4c0d178ef`; approved pre-record revision SHA-256 `678bbdbf4a0648930e12e60fe0f2ecbf929eb200fe045d5d8ca39f7f0e318791`)
  - PRD (original T2a packet input, pre-packaging revision): `docs/prd/prd-brainstorm-research-quality.md` (historical packet input SHA-256 `43411c7a97917bdd3c29b080bb7f6a98c4d3fa77506af3789b12430c5677fafa`; subsequently updated in the PR packaging pass to reflect completed preparation status)
  - LOCAL supplemental assignment packet (gitignored): `artifacts/brainstorm-research-quality/task-2-brief.md`
- **Boundaries**:
  - Zero evaluation model runs executed (`evaluation_model_runs: 0`); zero recursive agents (`recursive_agents: 0`).
  - No evaluation spend was authorized or incurred. Total preparation cost is unknown because the host exposes no complete token/pricing/actor total; no zero-cost or savings claim is made.
  - Core workflow files, `SKILL.md`, and the earlier `references/brainstorm-evaluation.md` remain unmodified.
  - Frozen scenarios and the run context contain no grading oracles; expected responses live only in the grader guide.

## 2. Historical Inspection (T1, Bounded Document Review)

### 2.1 Method and Limits

- Every row below was read from the named `path:line` on this checkout. Quotations are paraphrased only where marked; line numbers are the observed locations.
- **Status vocabulary**: `business-direction change`, `requirement/contract correction`, `implementation correction`, and `unknown complete history`. These are separate observations; an implementation fix is never reported as a requirement correction.
- Each earlier brief was committed as a single snapshot in this checkout, so downstream commit sequences and re-opened decisions cannot be reconstructed from git history here. `unknown` means the inspected documents do not establish the complete history; it never means "unchanged".
- No reopen rate, correction rate, probability, or population inference is derived from seven documents.

### 2.2 Findings

| Brief | Approval and inspected evidence (`path:line`) | Business-direction change | Requirement/contract correction | Implementation correction | Complete history |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `brainstorm-decision-quality` | BRD approval `docs/brd/brd-brainstorm-decision-quality.md:5`; PRD scope `docs/prd/prd-brainstorm-decision-quality.md:3,9`; independent plan review correction `docs/prd/prd-brainstorm-decision-quality.md:116`; walkthrough `docs/srs/srs-walkthrough-brainstorm-decision-quality.md:5,15,29,31,33` | None observed | **Observed (completeness only)**: PRD:116 states that independent plan review identified three omitted source obligations and that canonical rows now retain conditional intent examples/anti-goals, complete option-analysis controls, and explicit delegation of minor builder decisions. This is a requirements-completeness correction, not a changed business direction. | Observed: SRS:15 records parser-ID normalization; SRS:29 and :31 record word-cap and pending-status failures followed by corrected package behaviour. | `unknown` |
| `video-seo-roi` | BRD approval `docs/brd/brd-video-seo-roi.md:3`; PRD scope `docs/prd/prd-video-seo-roi.md:5,9`; walkthrough `docs/srs/srs-walkthrough-video-seo-roi.md:5,23,32` | None observed | None observed in the inspected documents | Observed: SRS:23 records a corrected cross-package link and path normalization; SRS:32 records fail-closed generator provenance recovery and successful ordinary generation. | `unknown` |
| `testing-reference-improvements` | BRD approval `docs/brd/brd-testing-reference-improvements.md:8`; PRD scope `docs/prd/prd-testing-reference-improvements.md:6-7,13`; walkthrough `docs/srs/srs-walkthrough-testing-reference-improvements.md:5,10-14,50` | None observed | None observed: PRD:13 states operational decomposition only; PRD:54-68 requirement/AC rows retain scope. | Observed: SRS:50 states initial source/browser reports were rejected for incorrect stability guarantees, unsafe fallback namespaces, swallowed cleanup failures, and overclaimed evidence, then corrected. These were implementation/test-report fixes, not approved-requirement changes. | `unknown` |
| `system-architecture-skill-evolution` | BRD approval `docs/brd/brd-system-architecture-skill-evolution.md:3`; PRD `docs/prd/prd-system-architecture-skill-evolution.md:6-8,13,53,55` | None observed | Observed at PRD:13: the requesting maintainer approved registry-backed guide discovery and deferred installed-host guide delivery on 2026-11-07. PRD:55 records the inspected delivery limitation. This is a delivery-boundary correction. | None observed in the inspected documents | `unknown` |
| `mcp-security-assessment` | BRD approval `docs/brd/brd-mcp-security-assessment.md:9`; PRD `docs/prd/prd-mcp-security-assessment.md:7-9,10-11`; walkthrough `docs/srs/srs-walkthrough-mcp-security-assessment.md:7,9,50-52,56,103,105-124,126` | None observed | None evidenced as a changed requirement: SRS:56 says independent document checks found no consequential behavioural omission after recorded corrections, and SRS:103 says later repository work did not reopen settled requirements or oracle meaning. The exact correction delta is not shown, so a requirement-level change is `unknown`, not asserted. | Observed, chronologically: SRS:50 explicitly labels lines 51-52 a **historical readiness snapshot**; SRS:105-124 records the later separately authorized repository delivery (`source_ready`, `partially_implemented`), including the delivered workflow/skill, generation/install checks, and finite evaluator regression; SRS:126 records a Major review finding in evaluator assertions and its isolated correction. SRS:122 still records native semantics/host enforcement/acceptance `NOT RUN`. Therefore "downstream coding not performed" is not a final-state claim; it describes only the earlier readiness point. | `unknown` |
| `provider-neutral-security-depth` | BRD approval `docs/brd/brd-provider-neutral-security-depth.md:8`; PRD approvals `docs/prd/prd-provider-neutral-security-depth.md:10-11`; walkthrough `docs/srs/srs-walkthrough-provider-neutral-security-depth.md:8,43,51,55` | None observed | None observed in the inspected documents | Observed: SRS:51 records final GREEN on delivered bytes; SRS:55 records an earlier trace run that failed on two document-format defects and was fixed before the recorded pass. | `unknown` |
| `skill-system-effectiveness` | BRD approval `docs/brd/brd-skill-system-effectiveness.md:8`; no matching file under `docs/prd/`; walkthrough `docs/srs/srs-walkthrough-skill-system-effectiveness.md:4-5,48-50,56` | None observed | None observed | None observed; SRS:48-50 records a revision-2 closure and readiness limits, and SRS:56 lists remaining implementation and live-qualification gates. | `unknown` |

### 2.3 Chronology and Non-Conclusions

- **MCP**: the readiness block at SRS:50-52 is contemporaneous with the design/readiness review, not the final repository state. The later `Repository Delivery Results` section supersedes the "no coding" reading for repository scope while leaving native-host/model acceptance unexecuted. Both facts are reported; neither erases the other.
- **Brainstorm decision quality**: PRD:116 is evidence of corrected requirements completeness. It is not evidence that business direction, scope, or objectives changed, and it is not a population reopen signal.
- **No inferred rates**: seven single-commit document sets cannot support "rarely reopened", "no changes occurred", or any reopen percentage. Those claims are not made.
- **Dates and statuses** are taken only from the quoted lines, not from memory.

## 3. Evaluation Preparation Kit (T2a)

### 3.1 Direction Quality Reference (grader rubric)

- **Path**: `skills/common/common-decision-discipline/references/direction-quality-evaluation.md`
- Provides six operational dimensions with PASS/FAIL/N/A criteria and evidence requirements, six critical-violation vetoes, cost-accounting rules, and the execution protocol.
- **Unknown-intent and lane rules**: a question-only response is `N/A` for the handoff dimension when intent is genuinely unresolved; Direction-lane technical alternatives and Why-lane business alternatives are not interchangeable, and omission from the wrong lane is not a failure.
- **Autonomous modes**: `assumed-autonomous` remains valid for supported low/medium, non-sensitive work; the sensitive-change risk floor and explicit human sign-off for sensitive or high-tier autonomous work are preserved.
- **Synthetic boundary**: fixture values are not real vendor terms, product facts, customer demand, or market evidence.
- **Portable cost assets**: `skills/common/common-decision-discipline/assets/cost-record.schema.json` and five validation examples under `skills/common/common-decision-discipline/assets/cost-record-examples/` (`valid-measured-record.json`, `valid-unmetered-record.json`, `invalid-negative-value.json`, `invalid-arbitrary-value.json`, `invalid-missing-required-fields.json`). Four obsolete duplicate copies created in an earlier local draft under `benchmarks/evals/` were deleted during local preparation after verifying the canonical assets (never present in base or PR diff).

### 3.2 Frozen Scenarios (prompts only)

- **Path**: `benchmarks/evals/brainstorm-research-quality-scenarios.json`
- **Count**: 19 prompt records: IDs 1, 6, 7, 10, 11, 12, 13, 15, 17-27.
- **Contents**: `id`, `scenario_group`, `prompt` only. No expected outputs, verdicts, or assertions.
- **Controls**: IDs 11 and 12 reuse the existing sensitive-floor and pending-approval cases.
- **Discovery variants**: ID 24 declares `discover-product` missing; ID 27 declares it installed. They are distinct IDs because the available package differs.
- **Tier pair**: IDs 20 and 21 ask the identical FastVectorEngine question at Standard and Deep.
- **Exhaustion**: ID 22 binds lookup to the fixture directory with a synthetic 1-call cap; no AcmePay fixture exists, and the single declared read of the missing source consumes the cap and emits a cap-reached signal. Proposed environment contract, not an observed transcript.
- **Early stop**: IDs 20 and 21 bind a single readable fixture with caps 2 and 5; one call can reach the supplied source, leaving cap unused, and the tool log records the count.
- **Quick protection**: ID 25 is Quick-tier with no lookup.
- **Unavailable lookup**: ID 26 declares `lookup_tools_available=false`.

### 3.3 Run Context and Grader Guide

- **Run context**: `benchmarks/evals/brainstorm-research-quality-run-context.md` — non-oracle environment specification: sandbox, tool vocabulary, lookup-count semantics, synthetic caps, fixture bindings, and package variants. It states that no harness is implemented and that real-tool execution is `NOT RUN`.
- **Grader guide**: `benchmarks/evals/brainstorm-research-quality-grader-guide.md` — grader-only expected behaviours for the 19 scenarios. It is never supplied to a worker.
- **Source reads**: a lookup is an ordinary read of supplied sandbox bytes, not a simulated private service; fixture bytes are never pasted wholesale into prompts.

### 3.4 Synthetic Source Fixtures

- **Directory**: `benchmarks/evals/brainstorm-research-quality-sources/`
  - `synthetic-vector-benchmarks.md` — FastVectorEngine performance, dimension, and pricing fixture.
  - `synthetic-adversarial-compliance.md` — compliance rules plus a simulated adversarial instruction payload.
  - `synthetic-auth-integration.md` — CloudSAML specification fixture retained for non-oracle source material; no current prompt depends on it after the ID 21 correction.

### 3.5 Extended Eval Suite

- **Path**: `skills/common/common-decision-discipline/evals/evals.json`
- **Preserved**: cases 1-16 are unchanged from source revision `28140c6a09cc429148af67edd254f57de0958dac`.
- **Updated**: cases 20-26. ID 21 now matches the FastVector scenario rather than the stale CloudSAML prompt. Incidental substring anchors and unsafe bare bans were removed or replaced with prompt-grounded fact anchors. The Quick-tier case does not require routing metadata.
- **Added**: case 27 for the `discover-product` installed variant.

## 4. Coverage and Proposed Run Arithmetic

| Scenario group | IDs | Criteria exercised |
| :--- | :--- | :--- |
| Existing clear/settled cases | 1, 6, 15 | AC-005, AC-006, AC-021 |
| Existing unknown intent | 7 | AC-005 |
| Existing solution-biased/uncertainty | 10, 13 | AC-007, AC-008 |
| Existing sensitive-floor control | 11 | AC-020, AC-021, risk floor |
| Existing pending-approval control | 12 | AC-020, approval gates |
| New open/novel with known intent | 17, 18, 19 | AC-007, AC-008 |
| Outside fact, Standard vs Deep | 20, 21 | AC-009, AC-010, AC-011, AC-013 |
| Budget exhaustion | 22 | AC-012 |
| Untrusted source instructions | 23 | AC-016 |
| Customer/market gap (missing) | 24 | AC-017 |
| Quick-tier outside fact | 25 | AC-014, AC-021 |
| Lookup unavailable | 26 | AC-015 |
| Customer/market routing (installed) | 27 | AC-017 |

- **Proposed intake runs**: 19 scenario IDs × 3 arms × 1 repetition = **57 intake runs** (previously 48 at 16 scenarios; +9 runs, about +19%).
- **Proposed grading**: 57 grader applications, one per transcript; targeted repeats of deciding scenarios are additional and unbudgeted.
- These counts and caps are proposals requiring maintainer approval, not approved budgets.

## 5. Generation and Export Status

- **Actual generator entrypoint**: `package.json:89` maps `generate-indices` to `tsx scripts/generation/index.ts`.
- **Scoped options discovered from source**: `scripts/generation/index.ts:46` documents only `--check`, `--adopt-base <fullsha>`, and `--recover-provenance <fullsha>`. No category, skill, or path-scoped mode exists.
- **Historical T2a worker freeze state**: T2a inspected the entrypoint and left generation unexecuted so a separate narrow fix and controlled apply could be authorized first.
- **Separately approved narrow generator prerequisite**: Real generation apply initially failed in `archivePublicationBeforeState` (`scripts/generation/isolated-stage.ts`) with `ENOENT` because `publication-before/proof.json` had no parent directory when all destination files were new (`appliedFiles: []`, `publicationCommitted: false`). The authorized fix added `fs.ensureDir(beforeDir)` before writing `publication-before/proof.json` without weakening proof or no-clobber invariants, paired with a focused regression test in `scripts/generation/isolated-stage.test.ts`.
- **Completed apply and parity**: After the fix passed its focused RED/GREEN regression, real `generate-indices` apply succeeded (`status: APPLIED`), exporting all 28 new host resources (`direction-quality-evaluation.md`, `cost-record.schema.json`, and 5 `cost-record-examples/*.json` × 4 configured hosts: `.agents`, `.claude`, `.codex`, `.github`) and updating local gitignored `.skills-lock.json` (local generation state only; not committed and never force-added to the PR). Subsequent `generate-indices --check` passed parity. No manual export copying or provenance bypass was used. Active external/project installations remain untouched (`NOT RUN`).

## 6. Verification Ledger and NOT RUN Lanes

This table is self-contained for PR review: every assertion below describes what was tested, the actual command or method, the observed result, and its exact verification boundary without requiring gitignored `artifacts/` files to understand the check. Where local gitignored receipts exist, they are marked **LOCAL supplemental**.

| Lane | Command / Method | Observed Result | What Was Tested and Boundary | Evidence Provenance |
| --- | --- | --- | --- | --- |
| Frozen dependency install (T0) | `rtk proxy pnpm install --frozen-lockfile` and `rtk proxy pnpm exec tsx --version` | **PASS** (exit 0; 5 workspace projects, `+999` packages, `tsx v4.23.15` / `node v26.0.0`) | Restored `node_modules` without modifying lockfile. Default pnpm config ignored build scripts for `@parcel/watcher`, `@scarf/scarf`, `esbuild`, `unrs-resolver`. | Executed in T0 (`LOCAL supplemental`: `artifacts/brainstorm-research-quality/task-0-receipt.json`) |
| Cost-record schema smoke | AJV (`strict: false, allErrors: true`) validating `skills/common/common-decision-discipline/assets/cost-record.schema.json` against 5 canonical examples + cloned missing-`tool_calls` fixture | **PASS** (`measuredAccepted: true`, `unknownAccepted: true`, `negativeRejected: true`, `arbitraryUnknownRejected: true`, `missingToolCallsRejected: true`) | Verified valid measured/unmetered records pass and negative numbers, arbitrary non-`"unknown"` strings, and missing `tool_calls` fail. Finite schema validation only; does not test live host metering. | Canonical schema & examples in repo (`LOCAL supplemental`: `artifacts/brainstorm-research-quality/check-kit.cjs`, `schema-smoke-result.json`) |
| Original eval cases 1–16 preservation | JSON equality check of `skills/common/common-decision-discipline/evals/evals.json` (`id <= 16`) vs `git show 28140c6a09cc429148af67edd254f57de0958dac:skills/common/common-decision-discipline/evals/evals.json` | **PASS** (`originalCasesPreserved: true`) | Confirms all 16 pre-existing baseline eval cases match revision `28140c6a09cc429148af67edd254f57de0958dac`. Cases 17–27 are unexecuted new/updated definitions. | `skills/common/common-decision-discipline/evals/evals.json` (`LOCAL supplemental`: `schema-smoke-result.json`) |
| Eval preflight (focused selection) | `rtk proxy pnpm evals:preflight -- --skills-file <selection>` (selecting only `common/common-decision-discipline`) | **PASS** (exit 0; `0` issues) | Structural/metadata validation of the skill's `evals.json` only. Executes zero model workers and is not a behavioural pass. | `skills/common/common-decision-discipline/evals/evals.json` (`LOCAL supplemental`: `artifacts/brainstorm-research-quality/selection.txt`, `task-2-receipt.json`) |
| Single generator regression (RED -> GREEN) | `rtk proxy node --import tsx --test --test-name-pattern="all-new outputs without an existing lock file publish bytes, before-state proof, and pass check" scripts/generation/isolated-stage.test.ts` | **RED -> GREEN** (`exit 1` expected RED with `ENOENT` on `.../publication-before/proof.json` before fix; `exit 0`, `1/1` pass after `fs.ensureDir(beforeDir)` fix and adding inherited `LICENSE.TXT` to expected output list) | Verifies `runIsolatedGeneration` publishes all-new `.github` host outputs, writes `publication-before/proof.json` with `sha256: null` before-records, writes `.skills-lock.json`, and passes subsequent `checkOnly` parity when no prior outputs or lockfile existed. Single focused regression only; full `test:generation` / `pnpm test` suite `NOT RUN`. | `scripts/generation/isolated-stage.ts`, `scripts/generation/isolated-stage.test.ts` (`LOCAL supplemental`: `artifacts/brainstorm-research-quality/generator-fix-receipt.json`) |
| Real generator apply & parity | `generate-indices` real apply followed by `generate-indices --check` | **PASS** (initial pre-fix apply failed with `ENOENT`; post-fix apply `status: APPLIED` copying 28 new host files and updating local gitignored `.skills-lock.json`; subsequent `--check` PASS) | Confirms canonical-to-host export parity across `.agents/skills`, `.claude/skills`, `.codex/skills`, and `.github/skills` without manual file copying or provenance bypass. `.skills-lock.json` is gitignored local generation state (not committed or force-added to PR). In-repo export check only; not an external consumer sync. | Generated host files (`LOCAL supplemental`: `artifacts/generation-logs/attempt-2026-11-11T10-36-27-106Z-ed66a2/receipt.json`) |
| Disposable `SyncService` consumer smoke | Programmatic `SyncService` (`beginInstall`, `writeSkills`, `writeWorkflows`, `completeInstall`) + `lookupWorkflow(..., 'brainstorm-feature')` in a temporary directory configured for `Copilot`, `Antigravity`, `Codex`, `Claude` | **PASS** (`28/28` checked resources byte-identical to canonical source; `workflowStatus: "managed"`) | Verifies end-to-end delivery of all 7 new skill resources across all 4 hosts (`7 × 4 = 28`) and MCP workflow discovery as `managed`. Isolated temporary consumer only; active project/global installations untouched. | `cli/src/services/SyncService.ts`, `mcp/src/services/WorkflowIndex.ts` (`LOCAL supplemental`: `artifacts/brainstorm-research-quality/consumer-smoke.ts`, `consumer-smoke-result.json`) |
| Core file preservation (`AC-022` preparation boundary) | Verified parent diff check vs HEAD `28140c6a09cc429148af67edd254f57de0958dac` on `.agents/workflows/brainstorm-feature.md`, `skills/common/common-decision-discipline/SKILL.md`, and `skills/common/common-decision-discipline/references/brainstorm-evaluation.md` | **Preparation preserved (`zero diff vs HEAD 28140c6a09cc429148af67edd254f57de0958dac`); full `AC-022` `NOT RUN` / N/A until T3/T4** | Confirms preparation adds no mode and no trigger line, leaving core workflow, `SKILL.md`, and prior evaluation reference byte-for-byte unchanged. Not mode-authoring proof: full `AC-022` (authored mode diff with trigger sentence within 79 lines and unchanged `SKILL.md`) remains future `NOT RUN` / not applicable until T3/T4. | `docs/prd/prd-brainstorm-research-quality.md` (`AC-022`), `.agents/workflows/brainstorm-feature.md`, `skills/common/common-decision-discipline/SKILL.md`, `skills/common/common-decision-discipline/references/brainstorm-evaluation.md` |
| Independent scoped review | Static read-only review (`Personal · Analysis & Review`, `openai-codex/gpt-6.1-sol`) | **APPROVE** (Round 1 `CHANGES REQUESTED` -> 2 MAJOR findings fixed -> Final `APPROVE`, `0` outstanding substantial findings) | Verified closure of injection oracle leakage in `synthetic-adversarial-compliance.md` and ID 22 absent-source 1-call cap exhaustion contract. Static review only; does not establish model efficacy, ROI, rubric acceptance, spend, or release authority. | `LOCAL supplemental`: `artifacts/brainstorm-research-quality/independent-review-final.json` |
| Security / SAST / secrets scanning | Native SAST/security plan prepared; local `gitleaks`/`semgrep`/`trivy` binaries absent; parent staged-delta pattern/library security check planned; CI full `gitleaks` pending | **NOT RUN** (no security scan result claimed) | Native security scan was not started because the tool exposes no model/account pin details; local scanner binaries (`gitleaks`, `semgrep`, `trivy`) are absent. Parent staged-delta check and CI full `gitleaks` remain pending. | Planned / pending only; no pass claimed |

- **NOT RUN**: evaluation model runs (`evals:manifest --execute`, `evals:baseline`, 0 model runs), baseline transcripts or model grading (0 transcripts), maintainer rubric acceptance, full test/CI suite (`pnpm test`, `pnpm validate:all`, full `test:generation`), build/lint/formatters, Explore or research-spike mode implementation (T3/T4, including full `AC-022` mode-authoring checks), security/SAST/secrets scans (native SAST not started; local `gitleaks`/`semgrep`/`trivy` absent; parent staged-delta check and CI full `gitleaks` pending), active host installation sync, preparation-phase git commits (prior to authorized PR packaging/commit), merge, publication, release, or runtime activation.

## 7. Remaining Risks and Decisions

- Integration verified the replacement assets with the schema boundary smoke, then deleted the four obsolete local-draft benchmark schema/example copies individually during local preparation (never present in base or PR diff). Only `skills/common/common-decision-discipline/assets/` is canonical.
- Scenario caps and the 57-run arithmetic remain proposals; the maintainer owns budgets, thresholds, repetitions, and spend authorization.
- The historical review is document-bounded; complete downstream commit/PR history remains `unknown`.
- No evaluation spend, behavioural result, or mode implementation is claimed.

## 8. Artifact Checksums (SHA-256)

Checksums for the T2a evaluation-kit files and narrow generator-fix files frozen prior to PR documentation packaging:

- `skills/common/common-decision-discipline/references/direction-quality-evaluation.md`: `9ca8670003f49b165dc8c17593a0fffcd535a3f76ceb6b6b0e774187e84e9288`
- `skills/common/common-decision-discipline/assets/cost-record.schema.json`: `76ec9b0c0d4aaa853b26eecd3b3fff9e9186241cb6f62196adf56e5a32621cf0`
- `skills/common/common-decision-discipline/assets/cost-record-examples/valid-measured-record.json`: `75be615d44a9348bfdacbfdc3edc1e28637aab4f80ff370b4ffbf4d76437e540`
- `skills/common/common-decision-discipline/assets/cost-record-examples/valid-unmetered-record.json`: `61185a8d25b5711cf6c199004f6b0739184c69bf9d85c34fe426b6d2c0b7c19a`
- `skills/common/common-decision-discipline/assets/cost-record-examples/invalid-negative-value.json`: `1433706afceee09627099f3a88c5205f87d549208fa929f07a6d800bfa6fa29a`
- `skills/common/common-decision-discipline/assets/cost-record-examples/invalid-arbitrary-value.json`: `67cb36e55886e5c09bb985f82b2919218269cb9062a5a3195c3a48d96f060d30`
- `skills/common/common-decision-discipline/assets/cost-record-examples/invalid-missing-required-fields.json`: `7be94865c1ced707903533ecddd8af38c77394cd26bdbd88a6ba999e15f26d98`
- `skills/common/common-decision-discipline/evals/evals.json`: `8a239a89d3fbd5b80d26c6e54f9eff1f549a6741fbd6ca3b7b5ec75a6b7386de`
- `benchmarks/evals/brainstorm-research-quality-scenarios.json`: `1692329c2854af4b5d9438539f9883f54f903cdeef1dc7da31ad79264dc44fe7`
- `benchmarks/evals/brainstorm-research-quality-run-context.md`: `d3693a7b9a69f180c534530e97045608affea1368896ae7fa6019eed3b7e9f38`
- `benchmarks/evals/brainstorm-research-quality-grader-guide.md`: `9c6099f5b0d0596327534168537bbb3a45ce8dcc6ac8821e2f62ff78e096adf0`
- `benchmarks/evals/brainstorm-research-quality-sources/synthetic-vector-benchmarks.md`: `ea70c846bb23bda485cc8db6e4b84474e7d1647dbf92820596481547ec24350e`
- `benchmarks/evals/brainstorm-research-quality-sources/synthetic-adversarial-compliance.md`: `2451e53acc4bedf543b1b1193d1662066c2f08314f6181c9666e327fd92bb56b`
- `benchmarks/evals/brainstorm-research-quality-sources/synthetic-auth-integration.md`: `1a49f2809fb1bbef5396c34d4ebac0325a2c2bb6ad196176685fcd87d15bb758`
- `scripts/generation/isolated-stage.ts` (post-fix): `a6145933d9ac3573dd48bb3803e5c2395ec8fa4682e0c3e3e08485a4b8445f96`
- `scripts/generation/isolated-stage.test.ts` (post-fix): `575b8c47dbfa95ffc1b9fd809b371dbd16e2270b2b86ddac2a1a507cbeb40fbe`
- **LOCAL supplemental (gitignored, not in PR diff)**:
  - `artifacts/brainstorm-research-quality/check-kit.cjs`: `b6a1dbac9d57d1748ef7931d5ec3d04ea920f894482c781f73600c4615ec1e48`
  - `artifacts/brainstorm-research-quality/schema-smoke-result.json`: `ad81be50d9b054327d6f1ad35e6d2d871a612d7fb0f9768b786422f55e4df6b6`
  - `artifacts/brainstorm-research-quality/selection.txt`: `32fc4a56ee9374ea9011feb432a1c3258d867bedd0610eedb0b383f292490705`
- `docs/prd/prd-brainstorm-research-quality.md` and `docs/srs/review-brainstorm-research-quality.md` were subsequently updated for PR packaging and are therefore excluded from this pre-packaging freeze digest list.

## 9. Status
- `feature_status`: `requirements_ready` (canonical lifecycle inherited from approved BRD); `repository_status`: `technical_preparation_complete` for T0, T1, and T2a plus the separately approved narrow generator prerequisite. Maintainer rubric acceptance, baseline-only run plan/spend authorization, and T3/T4 mode implementation remain pending.
- Committed and verified preparation artifacts are self-contained in the repository (`docs/prd/prd-brainstorm-research-quality.md`, `docs/srs/review-brainstorm-research-quality.md`, `skills/common/common-decision-discipline/`, `benchmarks/evals/`, `scripts/generation/isolated-stage.*`, and 28 generated host exports under `.agents/skills`, `.claude/skills`, `.codex/skills`, `.github/skills`). `.skills-lock.json` is gitignored local generation state (local-only, not committed and never force-added to the PR); `artifacts/` entries cited above are `LOCAL supplemental` only.
- Independent static review (`Personal · Analysis & Review`, `openai-codex/gpt-6.1-sol`; ephemeral reviewer ID recorded in `LOCAL supplemental` receipt `artifacts/brainstorm-research-quality/independent-review-final.json`) approved the scoped technical preparation after closing both MAJOR findings: worker-visible injection response guidance was removed, and ID 22's frozen prompt, canonical eval, environment, and grader contract now agree on a synthetic 1-call cap with actual cap-reached evidence required. Cases 1–16 remain unchanged from `28140c6a09cc429148af67edd254f57de0958dac`. This is an unexecuted proposal freeze revision, not a rewritten baseline, and does not establish model efficacy, ROI, business acceptance, or release authority.
- Zero model answers, baseline results, evaluation runs, security scan passes, release, or activation were produced (and git commits were `NOT RUN` during the T0/T1/T2a preparation phase prior to PR packaging). Original plan proposed 16 scenarios (up to 48 eventual intake runs); T2a delivered a 19-scenario frozen prompt proposal (up to 57 eventual initial intake runs across 3 arms at 1 repetition, plus grading and any targeted repeats), subject to separate maintainer spend authorization.
- Cost coverage is partial: total preparation cost is `unknown` because host-reported estimates (`LOCAL supplemental`: `artifacts/brainstorm-research-quality/preparation-usage.json`) are partial, exclude parent/prior planning/review/failed Anthropic attempts, and are not invoices or allocated subscription costs. No zero-cost, savings, or ROI claim is made.
- Next gate: maintainer reviews the rubric and an explicit baseline-only run plan (19 scenarios, intake/grader models and settings, repetitions, per-run/total caps, and stop rules). None of the proposed 57 eventual intake runs, grading, T3/T4 mode implementation, merge, or activation is authorized by preparation completion.
