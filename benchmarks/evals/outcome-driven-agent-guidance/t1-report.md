# T1 candidate report — outcome-driven authoring guidance

Status: **corrective candidate revision R2, static only** — not behaviorally qualified, not published, not activated. Frozen for independent re-review. No paid eval, no commit, no delegation, no generated-mirror write, no scorer/runtime/schema change.

- Base revision: `c679e0032fbebf4eed90db0f2fc4f52541a3f23d` (frozen in `baseline/manifest.json`; T0 gate permits candidate development only).
- Scope: T1/REQ-01/AC-01–AC-02 plus the one independent review correction. T2/T3/T4/T5 untouched by this assignment.
- Report path: this file. Owned write set below; unrelated worktree changes belong to other slices.
- Correction inputs: T1 review findings 1–4, `skill://eval-assertion-hardening`, `skill://finite-decision-contract-eval-authoring`, and `scripts/evals/scorer.ts`.

## Settled files (frozen bytes, R2)

| Path                                                                       | Baseline bytes / sha256  | Candidate bytes / sha256                                                   | Limit                   |
| -------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------- | ----------------------- |
| `skills/common/common-skill-creator/SKILL.md`                              | 7612 / `a15c8d84…14627b` | 9600 / `dbe56fa9d09335b88ee121a27c074d6aeb8c3312dc97c796b23f4385a88a779f`  | 100 lines → 100         |
| `skills/common/common-skill-creator/evals/evals.json`                      | 4323 / `dde9e917…3ad94e` | 8018 / `6ba2142dd133db16195b86fb9863a74fd008a4adabf2eca4ac280abc954c3051`  | schema unchanged        |
| `skills/common/common-workflow-writing/SKILL.md`                           | 2510 / `21a72b6e…29762d` | 3626 / `2a87e5dd6ed78fcee8b032e07d857ba2af3b5800247e5d45327374eb46f0c02f`  | 80 lines → 62           |
| `skills/common/common-workflow-writing/evals/evals.json`                   | 4858 / `b9e81f40…6a5af0` | 11208 / `c7f31795008848622e18f47d161e8f196c27a5e549c62c3db7fd4c47d5bc47f5` | schema unchanged        |
| `skills/common/common-skill-creator/references/outcome-driven-guidance.md` | absent                   | 3848 / `5bc5c3107815c29510fe4bb2cb472ccdfa6d7db41d45d7ab50ae8df767805efb`  | new reference, 61 lines |

Disposable proof artifact added under the permitted directory: `benchmarks/evals/outcome-driven-agent-guidance/t1-discriminator-matrix.mjs` (real `checkAssertion`, no runtime/schema change). Its actual output is recorded in `t1-discriminator-report.md`.

No other file was modified by this slice. `mcp/test/SkillIndex.spec.ts`, `skills/flutter/flutter-cicd/SKILL.md`, `docs/prd/`, and the rest of `benchmarks/evals/outcome-driven-agent-guidance/` were already changed or untracked before this assignment.

## Design applied

Four obligation classes are now explicit in `common-skill-creator`: hard invariant, method default, task constraint, reference. Ambiguous classification retains the obligation and escalates. Host/core policy is referenced, not reproduced.

Outcome brief fields: outcome, relevant context, acceptance criteria, scope/authority, delegated choices, required evidence, stop condition. Simple tasks may use sentences.

Labeled illustrations are permitted when an output shape is ambiguous; they must be marked `Illustrative`, structurally distinct from results, and never presented as observed evidence. Concise rationale is allowed only for a non-obvious constraint. Evidence-driven correction is: mismatch → cited evidence → failed criterion → repair boundary → focused verification. On unchanged evidence the agent stops and names the missing input rather than retrying or switching method; a method change requires new evidence or a specific evidence-backed hypothesis/input.

`common-workflow-writing` carries the presentation-side rules and defers mechanism detail to the new reference. Editorial limits are unchanged: 80-line workflow, 100-line SKILL.md, 8 table rows, 10-line inline code block.

Eval cases that grade a policy now use finite decision/action blocks: prompt-enumerated fields, a whole-block shape assertion, one safe-value predicate per field, and an optional ungraded `NOTES:` line. The safe/unsafe values are enumerated, not free prose.

## Corrective review findings addressed

| Finding                                                                                                                    | Change                                                                                                                                                                                                                      | Evidence                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Bare `not_contains "examples are prohibited"` false-fails a compliant quoted rejection; no bans                         | Removed both bans. Replaced with `EXAMPLE_POLICY` / `SAMPLE_EVIDENCE` decision blocks. The wrong ban is an enumerated unsafe value that fails a value predicate, and an out-of-shape contradicting action line fails shape. | Matrix: quoted-rejection NOTES candidates pass; `ban_all_examples`, `presented_as_result`, and contradicting extra action lines fail |
| 2. Required `hard invariant` / `method default` / `restore it` accepted the reversed sentence; workflow never asserted TDD | Replaced vocabulary `contains` with 4- and 6-assertion decision contracts; added explicit `TDD: hard_invariant` and `APPROVED_SCOPE: hard_invariant`; removed the old vocabulary-only path.                                 | Matrix: reversed rows, old vocabulary-only output, missing TDD, reorder, duplicate, partial block all fail                           |
| 3. Unspecified test command cannot categorically be a method default                                                       | Eval 6 now specifies a documented equivalent runner invocation producing the same test evidence; the reference says to retain the current method or escalate when interchangeability is unproven.                           | Prompt/expected text; reference “Delegated method”                                                                                   |
| 4. Reference/eval said change method or request input while evidence is unchanged                                          | Both now require new evidence or a specific evidence-backed hypothesis/input before any retry or method change; otherwise stop and name the missing input.                                                                  | `SKILL.md` correction bullets, reference step 5, workflow eval 7 `RETRY`/`NEXT_ACTION`                                               |

Textual controls remain finite. A quoted unsafe phrase inside `NOTES` is intentionally ungraded; the matrix does not claim semantic safety or file-effect proof.

## AC status

| AC                                                                                                                           | Status                                                        | Evidence                                                                                                                                                                                           | Limit                                                           |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| AC-01 — every changed normative instruction has a baseline→candidate disposition and rationale; no protected obligation lost | **Candidate-complete; independent semantic review pending**   | Disposition ledger below                                                                                                                                                                           | This report is implementer evidence, not independent acceptance |
| AC-02 — ambiguous output shape permits a labeled illustrative example without presenting it as observed execution evidence   | **Candidate-complete; blinded transcript evaluation NOT RUN** | New rule in both skills; finite `EXAMPLE_POLICY` / `SAMPLE_EVIDENCE` contracts in eval 5 and workflow evals 1/8; real-scorer matrix accepts labeled-non-result and rejects ban/presented-as-result | Eval contracts are unexecuted; no behavioral claim              |

All other ACs are out of this assignment and are **NOT RUN** here.

## Obligation disposition ledger (baseline → candidate)

### `common-skill-creator/SKILL.md`

| Baseline obligation                                                                                                               | Disposition                                                           | Candidate location / rationale                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0 priority; token ROI; every line procedural; Activation + Implementation metrics                                                | Retained                                                              | Opening block, same meaning; host-policy priority added                                                                                                                                                                                    |
| Three-level loading: L1 ≤100 words, L2 ≤100 lines, L3 references on demand                                                        | Retained                                                              | Collapsed into the opening block; no numeric change                                                                                                                                                                                        |
| New-skill workflow steps 1–8 (research, capture intent, draft, test, evaluate, iterate, optimize description ≥90%, pressure-test) | Retained; capture intent expanded; test+evaluate merged into one step | Steps 1–8. Expansion adds outcome/scope/evidence/stop fields (REQ-01); merge removes presentation duplication only                                                                                                                         |
| Existing-skill workflow steps 9–15 (audit, snapshot, improve, test, evaluate/iterate, optimize, harden)                           | Retained; audit now also classifies obligations                       | Steps 9–14. Snapshot-before-edit and baseline comparison preserved                                                                                                                                                                         |
| Third-person voice; What+When; specificity; trigger hint                                                                          | Retained                                                              | Two bullets; trigger hint kept verbatim                                                                                                                                                                                                    |
| No redundant knowledge                                                                                                            | Retained                                                              | Verbatim intent                                                                                                                                                                                                                            |
| Readable compact style; size is an editorial budget, not a behavioral quality claim                                               | Retained                                                              | Verbatim intent                                                                                                                                                                                                                            |
| “Examples must be copy-paste ready and executable”                                                                                | **Narrowed**                                                          | Now “Commands and snippets must be runnable; prose must state a concrete decision or check.” Executability remains for commands/snippets; an illustrative example is not required to be an executable artifact. No fake evidence permitted |
| Workflow clarity: ordered lists for multi-step processes                                                                          | Retained, tightened                                                   | “Progressive Disclosure” bullet: prescribe sequence only where dependency, auditability, or safety requires it                                                                                                                             |
| Progressive disclosure >10 lines to references                                                                                    | Retained                                                              | Same bullet                                                                                                                                                                                                                                |
| Pressure hardening                                                                                                                | Retained                                                              | Verbatim intent                                                                                                                                                                                                                            |
| Evidence tiers; oracle/pressure hardening; digest binding/thresholds; discovery/publication preflight                             | Retained                                                              | All four bullets preserved, including host-guardrail retention and publication≠activation                                                                                                                                                  |
| Anti-patterns: AI-splaining; answer-anchor padding                                                                                | Retained (merged)                                                     | One bullet; both prohibitions intact                                                                                                                                                                                                       |
| Anti-patterns: search-absence conflation; vague triggers; description bloat; long code blocks; untested guardrails                | Retained                                                              | Trigger/bloat/code-block rules merged into one bullet; limits unchanged                                                                                                                                                                    |
| Quality checklist: Activation ≥90%, Implementation ≥90%, structure, trigger rate, guardrail evidence                              | Retained (four checklist lines)                                       | Trigger rate merged into Activation; guardrail evidence retained                                                                                                                                                                           |
| References index                                                                                                                  | Retained + added                                                      | New `outcome-driven-guidance.md`; all prior links preserved                                                                                                                                                                                |
| —                                                                                                                                 | Added                                                                 | Obligation Classes, labeled illustrations, concise rationale, outcome brief, evidence-driven correction with a new-evidence/missing-input stop rule as the REQ-01 delta                                                                    |

No hard invariant was removed. No safety, authority, evidence-tier, review-gate, or editorial-limit obligation was downgraded.

### `common-workflow-writing/SKILL.md`

| Baseline obligation                                                                                        | Disposition                              | Candidate location / rationale                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “Templates, not examples” blanket ban                                                                      | **Narrowed**                             | “Templates for results, labels for illustrations.” The anti-fabrication purpose is retained; a labeled illustration is no longer banned outright (AC-02)              |
| Table rule: headers + 1 skeleton row only; never fake data                                                 | Retained + refined                       | Same bullet: headers plus at most one skeleton row; no fictional result rows; labeled sample allowed                                                                  |
| “No prose explanations” blanket ban                                                                        | **Narrowed**                             | One clause is allowed for a genuinely non-obvious constraint; narrative preambles/restatement still deleted. Rationale: T1 permits concise non-obvious rationale      |
| No pre-answered questions                                                                                  | Retained                                 | Verbatim intent                                                                                                                                                       |
| Merge sequential steps                                                                                     | Retained                                 | Grammar fixed only                                                                                                                                                    |
| Size limits (80/100/8/10)                                                                                  | Retained                                 | Table unchanged                                                                                                                                                       |
| Required structure: goal, imperative steps, output template headers                                        | Retained; optional stop/escalation added | Line 3 now says headers only and marks any `Illustrative` sample; adding stop/escalation does not relax required order                                                |
| Anti-patterns: verbose preambles; pre-filled rows; repeated examples; “How to X”; caution blocks           | Retained                                 | Preambles narrowed to allow one non-obvious clause; “pre-filled rows” replaced by “No fabricated results” with the same effect plus the labeled-illustration boundary |
| Portable output contracts (`feature_status`, missing evidence, decision needed; no runtime-specific names) | Retained                                 | Verbatim                                                                                                                                                              |
| Self-check: reconstructability, real table rows, paragraph→bullet, half-cut test                           | Retained; clarifier added                | Illustration label added to the row check; method-choice check added                                                                                                  |
| —                                                                                                          | Added                                    | Outcome-before-procedure, evidence-driven correction, no blind retries as the REQ-01 delta                                                                            |

## Eval contract changes (R2)

No scorer schema, assertion type, or runtime evaluator was changed. Policy cases now use only the existing `regex` type; no new field was added. The earlier R1 rubric is explicitly withdrawn: its `contains` tokens accepted the reversed sentence, and its bare `not_contains "examples are prohibited"` false-rejected a compliant quoted rejection. Both defects are absent in R2.

Each policy case declares prompt-enumerated fields at column 0, a whole-block shape assertion, one safe-value predicate per field, and an optional terminal `NOTES:` line. The shape admits every enumerated safe and unsafe value; the predicates grade the safe decision. `regex` is the only assertion type on these cases, so `auditAssertionAlignment` does not apply task-anchoring rules, while the real scorer self-check confirms every assertion matches `expected_output`.

### `common-skill-creator/evals/evals.json`

- Eval 1: prior `evals` token replaced with a `hard invariant` expectation in `expected_output`; structural creation checks retained.
- Eval 2: adds an obligation-classification disposition alongside the retained structural checks.
- Eval 5 (new): finite block `EXAMPLE_POLICY` + `SAMPLE_EVIDENCE`; 3 assertions (shape + 2 predicates). A `ban_all_examples` or `presented_as_result` value fails a predicate; an unlabelled tail or fence fails shape.
- Eval 6 (new): finite block `REVIEW_OBLIGATION` + `TEST_COMMAND` + `ACTION`; 4 assertions. Reversed values, missing fields, duplicates, reorder, and a contradicting extra action line fail. The test-command premise is now a documented equivalent runner producing the same evidence, so a method-default decision is justified rather than assumed.
- Pressure scenario added for fabricated PASS rows with the same decision block.
- Rationalization/red-flag pairs added for “sample = verified result”.

### `common-workflow-writing/evals/evals.json`

- Eval 1: replaced the block-ban `not_contains` with a 4-field decision contract (`EXAMPLE_POLICY`, `LENGTH`, `OUTPUT`, `RATIONALE`); 5 assertions.
- Eval 2: asserts the narrowed rationale rule (`imperative`, `non-obvious`, `delete`) and remains task-anchored `contains`.
- Eval 6 (new): 5-field gate contract including explicit `TDD: hard_invariant` and `APPROVED_SCOPE: hard_invariant`; 6 assertions. Missing or downgraded TDD fails.
- Eval 7 (new): `RETRY` + `NEXT_ACTION`; 3 assertions. `repeat` or `change_method_now` fails; old “change method on unchanged evidence” prose fails shape.
- Eval 8 (new): `EXAMPLE_POLICY` + `SAMPLE_EVIDENCE`; 3 assertions.
- Pressure scenarios updated to the same blocks for fabricated PASS rows and blind reruns; rationalizations/red flags aligned.

`expected_output` is the canonical ordered block for every new case and satisfies every assertion, as shown by the matrix self-check. `NOTES` is deliberately ungraded: a quoted unsafe phrase there does not fail, and that is a documented textual limit, not a safety claim.

## Checks actually run (report-only classification)

Working directory: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/illegal-platypus`.

1. **Real-scorer discriminator matrix** — `node --import tsx benchmarks/evals/outcome-driven-agent-guidance/t1-discriminator-matrix.mjs`, importing the real `checkAssertion` and the committed eval assertions. Exit 0. `MATRIX PASS: 41 candidates (13 pass, 28 fail), 0 mismatches, 0 self-check failures.` Self-checks: every used case has 3–6 assertions, regex-only, and its `expected_output` satisfies every assertion. Accept controls include canonical LF, CRLF+tabs, indented LF, and quoted unsafe phrases in `NOTES`; reject controls include reversed/unsafe values, old vocabulary-only output, missing fields, duplicates, reorder, packed fields, fences, unlabelled tails, and a correct block followed by a contradicting action line. Full output: `t1-discriminator-report.md`.
2. **Scoped eval contract audit** — the same `quality.ts` functions filtered to `common/common-skill-creator` and `common/common-workflow-writing`: `preflight 0 audit 0`. PASS. This is a contract/structural check, not behavioral efficacy.
3. **JSON parse** — `node -e "JSON.parse(...)"` on both eval files: `JSON OK` for both. Structural only.
4. **Prettier check** — the two `evals.json` files, the new reference, and this report: `All matched files use Prettier code style!` PASS.
5. **Prettier on SKILL.md** — NOT APPLICABLE as a gate: the frozen baseline versions of both `SKILL.md` files are already unformatted under repo Prettier (verified by formatting `git show HEAD:<path>` bytes and comparing). Candidate Markdown follows baseline style.
6. **Line/editorial limits** — `wc -l`: skill-creator 100 (limit 100), workflow-writing 62 (limit 80), new reference 61. PASS.

Dependencies were provisioned by the parent via `rtk pnpm install --frozen-lockfile --ignore-scripts`; no install was performed here.

## NOT RUN

- Behavioral with-skill vs baseline comparison (AC-02 blinded transcript evaluation, AC-03–AC-08) — no paid or live evaluation authorized; T0 capability finding says the default adapter refuses live execution and action traces are not retained.
- T4 qualification, 144-trial comparison, any cost/savings claim — not authorized.
- `generate-indices`, mirror regeneration, publication parity, activation — outside T1.
- Repo-wide `pnpm evals:audit`, `pnpm test`, build, lint, and repo-wide `check-alignment` — not run; no mid-flight suite. The scoped audit and the matrix self-check cover the changed cases only.
- Independent semantic review of AC-01 — **pending**; this ledger is implementer evidence.

## Residual risks / reviewer focus

1. **Narrowing check**: “copy-paste ready and executable” was narrowed to runnable commands/snippets. A reviewer who considers executable examples a hard invariant rather than a method default should reject or amend that line.
2. **Assertion strength**: the decision contracts reject reversed, partial, reordered, packed, duplicate, and out-of-shape responses, but they remain textual. They cannot prove which files an agent wrote, whether evidence was fabricated outside the graded block, or that a model will emit the block. AC-02 remains behavioral evidence, not static proof.
3. **Reference discoverability**: the new reference is linked from `common-skill-creator`’s References list. The linked file is not generated and does not alter resource manifests; distribution parity is T5 work.
4. **`NOTES` is ungraded**: a quoted or negated unsafe phrase inside `NOTES` passes by design (finite-decision contract). A contradicting action outside the block fails shape; prose inside `NOTES` is not a safety signal. No claim of semantic safety is made.
5. **No behavioral qualification claim**: static structure, transcript decisions, executable outcomes, human acceptance, and activation remain distinct statuses.

Freeze: owned bytes above are the T1 R2 candidate. Any later edit invalidates the hashes and this report's static evidence; re-run the matrix, scoped audit, and Prettier check after such a change.
