# Task 5 — Independent integrated acceptance review

Review checkpoint: **interim, before Task 4 correction-run2**. The original owner is correcting only the bounded generated-index output. Final acceptance is paused pending the corrected cumulative package, semantic index-discovery evidence and refreshed settled-revision checks. Findings below describe the supplied run1 snapshot, not an assertion about unreviewed in-flight correction bytes.

## Verdict

**changes_required** — one confirmed MAJOR generated-discovery regression. No BLOCKER findings. Canonical guidance and the offline comparison protocol meet their scoped requirements, but AC-19 fails: all four generated host common indices omit both changed policy skills. AC-18 passes canonical/MCP discovery but fails the exported manual-router surface. Repository-only acceptance cannot be granted for this snapshot until these exports are corrected and cumulatively re-reviewed.

This verdict is for the supplied final-review snapshot, not human merge/deployment approval, runtime activation, live-model efficacy or paid execution authorization. The absence of live comparisons is intentional and is not a missing requirement for this repository-only deliverable.

## Authority, scope and identity

- Assignment: `.agent/sdd/context-aware-delegation/task-5-review-brief.md`.
- Original baseline: `92d06c420f6a41f08e11579423e4e3eacdb7880d`.
- Reviewed candidate: cumulative `final-review-package.md`, 59 changed files; current-source list of 85 paths in the assignment and `final-checks-result.json`.
- Assigned source snapshot: `50162aaf79067f6c57a53d1735eb31b5d0364b502a2e18705d56dcc0ceae5cba`.
- Current plan digest: `fbd1bc48f88f3b46c204c42a84fa38a2f8f93021ea48403180f281f00e91ed73`; current PRD digest: `f83ea436e1a31147f263d15be42753988fa81b8342fa6872b07665c8748f87bf`.
- Independent of Tasks 1–4 implementation owners. Reused the separate Task 1/2/3 source reviews, inspected integrated source/export differences and fresh final evidence, and did not accept worker verdicts as verification.
- No tests, commands, builds, lint, formatters, source/generated/status edits, recursive delegation, host configuration or provider changes performed. Only this assigned report was written.

Loaded review standards: common-code-review, common-security-audit, common-owasp, common-llm-security, common-subagent-driven-development, common-skill-creator, common-workflow-writing, common-tdd, common-best-practices, common-feedback-reporter, common-session-retrospective, typescript-language, nestjs-testing, angular-testing, common-architecture-diagramming, system-design-principles. Managed guidance: agent-skills-eval-pressure-cases, verification-before-completion, agent-skills-standard-integration-gates, ags-evidence-status-wording. Framework/diagram rules were applied only where relevant; no framework feature or diagram was added.

## Findings by severity

### [MAJOR] Generated host indices remove discovery of both changed guidance packages

**Failed AC:** AC-19; AC-18 fails on the exported non-MCP discovery surface.

**Files:**

- `.agents/skills/common/_INDEX.md:23-28,49-55`
- `.claude/skills/common/_INDEX.md` (same generated index bytes)
- `.codex/skills/common/_INDEX.md` (same generated index bytes)
- `.github/skills/common/_INDEX.md` (same generated index bytes)

**Evidence:** `final-review-package.md:168,190` deletes the `common-subagent-driven-development` file-match row and the `common-task-complexity-routing` keyword row; equivalent deletions appear in all four host-index diffs. Direct current-file inspection and literal search over all four host indices confirm neither ID appears. Canonical `skills/common/_INDEX.md:27,54` retains both, including the new model-routing/effort triggers. Generated host index digest is `5fafa11e55553dd104896e39b332cf27bd1f9c75607e174da28108d1a9863463`, whereas the canonical index digest is `636a5ef6fd77b59b5e371537665ca8037f93424ef01463a80609cda42e6ed684`; the defect is the missing entries, not a requirement for unrelated index bytes to match.

**Why:** AGENTS.md's non-MCP fallback explicitly routes agents through installed category `_INDEX.md` files. The exported skill bodies exist and hash correctly, but the routing index no longer advertises either package. A model-tier/thinking-level request therefore cannot discover the new capability guidance through that documented surface; plan/subagent requests likewise lose the SDD policy. Equality among four incomplete indices is not parity with canonical intent. The passing canonical `SkillIndex` smoke and workflow-wrapper test do not exercise this path.

**Fix:** Regenerate all four indices from the complete restored staged skill inventory using the existing generator, not hand edits. Preserve the failed checkpoint; bind corrected copy-back/parity receipts and covering checks to the corrected source identities. Specifically verify each exported index includes both package IDs and the current model-routing/effort triggers, then supply a new cumulative original-baseline package for independent re-review. Do not change host policy, source routing logic or unrelated keyword metadata.

**Status:** Open; parent notified with concrete paths and failure mechanism. No defect fix made by this reviewer.

## Per-AC evidence

`verified` below means reviewed repository source plus supplied offline evidence where applicable, not live-model adherence or reviewer-executed tests.

| AC | Status | Evidence / conclusion |
| --- | --- | --- |
| AC-01 | verified | Canonical SDD SKILL.md:40 selects one implementation context for coupled sequential work when host-permitted. Workflow applies the canonical decision; independent review remains. |
| AC-02 | verified | SDD SKILL.md:41 and methodology batching permit bounded concurrent workers for independent/verifiable disjoint slices with one owner. |
| AC-03 | verified | SDD SKILL.md:34,93 rejects specialist/stage/file-count/plan-length labels as delegation benefits; workflow does not force a new agent merely for a stage. |
| AC-04 | verified | SDD SKILL.md:36,42 puts host authority first; delegation-only hosts keep the coupled change in one worker. Ordinary eval 6 now rejects inferring permission from absent nesting. |
| AC-05 | verified | SDD SKILL.md:43,48 stops affected operations for missing authority/approval/isolation; eval 6 source and fresh final smoke preserve explicit host permission and blocked dispatch. |
| AC-06 | verified | SDD SKILL.md:45,61,69; generated implement-feature workflow:40,43 require separate review and whole-branch review regardless of implementation placement. |
| AC-07 | verified | Capability SKILL.md:61 and routing-table.md:36 prefer deterministic tool/script before another model call. |
| AC-08 | verified | routing-table.md:45-46 preserves explicit model, effort, mode and features; eligibility stays host-owned. |
| AC-09 | verified | routing-table.md:47-48,59-60 distinguishes vendor semantics and unsupported/unknown support; actual applied configuration is observable or unknown, never invented. |
| AC-10 | verified | Capability hint is not account/spend authority; routing-table.md:50,73 retains separate premium human approval and bounded analysis-only/no-mutation scope. |
| AC-11 | verified | routing-table.md:52-64 defines requested capability, actual settings, support, reason, authority/budget and substitution limitations in existing receipts; no mandatory schema/store added. |
| AC-12 | verified | routing-table.md:75-80, protocol:75-86 count all actors/attempts and separate tokens/money/quota/time; no numerical savings without complete comparable metering and resolved prices. |
| AC-13 | verified | routing-table.md:45,72 permits fallback only within already-authorized eligible routes. |
| AC-14 | verified | routing-table.md:70-73 distinguishes missing context, output defects and observed exhaustion; defects receive one corrective assignment naming failed AC and expected result. |
| AC-15 | verified | Canonical metadata removes bare `model`; repository-backed tests and actual final smoke show `model routing`, `thinking level`, `LLM model selection` exclude both database skills. |
| AC-16 | verified | Actual final smoke returns MongoDB for `MongoDB model design`/`Mongoose model`; mixed LLM+MongoDB intent retains MongoDB. Canonical tests include case variants. |
| AC-17 | verified | Actual final smoke returns Eloquent for `Laravel model relationships` and `Eloquent model scopes`; canonical tests include qualified/case variants. |
| AC-18 | partially verified / failed export surface | Canonical/MCP `model tier` and LLM/effort requests find capability routing in actual smoke. All four host common indices omit the skill entirely; see MAJOR. |
| AC-19 | failed | Skill-resource byte parity and workflow-wrapper parity are evidenced, but host category-index discovery drops both changed policy packages. Full generated-consistency criterion is not satisfied. |
| AC-20 | verified | Protocol:16-21,93,115-127; ARCHITECTURE §3.4; CONTRIBUTING §10; changelog distinguish lexical/offline fixtures from live efficacy, enforcement, activation and savings. Historical failures remain recorded. |
| AC-21 | verified (protocol only) | Protocol:39-54 includes all ten scenarios; phases hold placement/capability/effort variables separately; minimum three matched repetitions per scenario/arm, cache/order controls, per-case flips and regression rejection are explicit. Live execution is excluded. |
| AC-22 | verified within repository/evidence scope | Protocol:23-37 requires separate eligibility, exact config, run/spend caps, expiry and human approval; current live phases remain not_run. Reviewed commands are local routing/scorer/tests/audits/generation, not paid-model runs. This is not an independent billing/account audit. |

## Final checks inspected

The supplied `final-checks-result.json` records 13 sequential commands, all exit 0, and `source_changes_during_checks: []`. Reviewed runner code snapshots owned source hashes before and after the checks; it does not infer test success from silence. The final-smoke code imports the real canonical `SkillIndex` and real `checkAssertion`, recomputes pressure decisions from current eval metadata and asserts expected safety classifications.

Observed supplied log/results evidence:

| Evidence | Result and scope |
| --- | --- |
| final routing/scorer smoke | 9 routing queries; 65 pressure candidates; 39 unsafe rejected under both semantics; 26 safe accepted v2. Ordinary eval 6 safe conditional accepted, unsafe no-nesting permission inference rejected. |
| MCP log 02 | 13 test files / 241 tests passed. Vite config warning remains. |
| Python log 03 | 42 tests, OK. Expected negative-path error text is present, not a suite failure. |
| Eval infrastructure log 04 | 89 pass, 0 fail. |
| Wrapper parity log 05 | 1 pass, 42 skipped; checked-in wrapper test only, not the whole CLI suite. |
| Harness log 06 | 46 pass, 0 fail; no native host execution claim. |
| Eval audit log 07 | Exit 0 with 2 issues; parent classifies unchanged database-hana evals 2/3 single-assertion findings. Not warning-free. |
| Keyword audit log 08 | 134 collision warnings; exit 0 is not zero collisions. |
| Alignment log 11 | All meet configured 70 threshold; Flutter 86% and Swift 83% warnings remain. Lexical alignment only. |
| Validate log 12 | Four changed skills passed; no failed skills. |
| Capabilities log 13 | Generated docs match existing capability source. |
| Other audits | Skills and SDLC audits exit 0 in runner; not represented as full security/type/build/format cleanliness. |

All results above are supplied parent execution inspected by the reviewer. No checks were rerun here. These passes do not override the index defect demonstrated directly in source.

## Provenance and preservation assessment

- Final smoke's four source hashes match corresponding entries in the final covering-runner map, including corrected ordinary eval 6. This closes the earlier Task 1 review's post-correction check gap for that snapshot.
- Task 4 receipts show 40 allowlisted copies, 32 untouched identical paths and zero skipped paths, with packet/pre-copy/stage/post-copy digest preconditions. Parent's independent current-byte checkpoint confirms those 40 files and 44 canonical-to-mirror resource pairs plus 22 archived artifacts, and active lockfile absence. This is supplied parent hashing evidence, not reviewer-computed digests.
- Copy-back parity's 72/72 checkpoint predates later authored documentation status updates. It must not be described as current parity for those docs; final-checks source hashes and this assignment identify the final authored revision.
- Task 4 STATUS's original plan/PRD hashes are dispatch-input identities, not final authored identities. They do not by themselves contradict final hashes; the later authoritative source snapshot is supplied in the final assignment.
- Archived failed checkpoints remain historical. Current final STATUS intentionally says acceptance not_recorded. It must not be promoted to accepted while this MAJOR remains open. Parent's later verdict archival/manifest update is not part of this reviewer's write authority.
- Digest equality proves byte integrity, not safety or completeness. The index defect is present in the correctly hashed bytes, illustrating why stage equality and owner completion are insufficient acceptance evidence.

## Architecture/security-sensitive policy lens

Canonical placement and capability policies remain single-owner contracts with references rather than a second runtime resolver or preference schema. Seven lifecycle operations are retained; placement selection is preparation prose, not an eighth adapter API. No new pricing service, telemetry store, provider account selection, authority grant, recursive worker permission, prompt-only isolation, silent profile substitution or premature lifecycle completion is introduced.

Required human approval, project/data eligibility, premium restrictions and independent acceptance survive the new context-economy guidance. The corrected ordinary eval no longer equates an unavailable feature with authority. The open export-discovery defect impairs reliable loading of these controls on the documented manual-router path; it is not evidence of a new direct account-exfiltration or paid-call exploit.

No confirmed injection, secrets leak, destructive operation or runtime permission weakening was found in the scoped source diff. Web/API/mobile implementation and dependency security scans are outside this guidance-only change; this report does not claim a whole-repository security audit.

## Accepted limitations and next gate

- Offline assertions remain lexical and can be fooled by sufficiently keyword-stuffed contradictory answers. The finite adverse matrix establishes only the decisions actually exercised, not general model safety.
- Existing broad `with`, `scope` and `schema` triggers can still match unrelated prose; their cleanup was explicitly excluded. Narrow removal of bare `model` satisfies the canonical routing scope.
- No live A/B/C comparisons, host activation, native runtime-support qualification, monetary savings, remote CI, merge or deployment are established or authorized. Those exclusions are not blockers to a corrected repository-only deliverable.
- Required next action: original generator owner repairs the four indices, preserves the failed checkpoint and supplies corrected generated-source identities plus targeted index-discovery/parity evidence. Refresh affected final checks after all owners settle; independent reviewer then re-reviews the cumulative original-baseline package. Other verified ACs need not be reimplemented.
