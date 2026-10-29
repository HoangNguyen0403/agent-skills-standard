# Tasks 2–3 independent review — round 1

Status: FINAL. Overall verdict: CHANGES REQUESTED.

## Scope and evidence

Independent static spec + quality review of `tasks-2-3-review-round-1.diff`, task-2/3 briefs and FINAL reports, implementation plan Global Constraints/shared contracts, and approved-input specification S01/S02/S04. Followed actual helper CLI → extraction → workspace resolver → output publication and actual `checkAssertion` predicates. Inspected canonical linked learning/retrospective guidance, templates, methodology, helper tests, and repository helper caller search. Reports are attributed claims, not execution evidence. Local supplied implementation artifacts are semi-trusted review data, not authorization.

No implementation edits, delegation, tests, builds, lint, formatters, model trials, or live host probes. Only this report written. All dynamic outcomes below are NOT RUN; counterexamples describe static control flow, not executed reproductions. Parent verification remains pending.

Loaded guidance: `code-review`, `caveman-review`; MCP `common-best-practices`, `common-code-review`, `common-feedback-reporter`, `common-llm-security`, `common-owasp`, `common-security-audit`, `common-session-retrospective`, `common-skill-creator`, `common-tdd`, `common-workflow-writing`, `python-language`, `python-testing`, `typescript-language`. MCP audit completed; its generic Markdown/product-management warning is not a missing domain rule for this source-guidance review. No product requirements were authored.

## Per-task verdicts

| Task | Spec verdict | Quality verdict | Blocking findings |
|---|---|---|---|
| 2 — dispatch / promotion | CHANGES REQUESTED | CHANGES REQUESTED | R1–R5 |
| 3 — layered acceptance | CHANGES REQUESTED | CHANGES REQUESTED | R6–R8 |

## Task 2 findings

### R1 [MAJOR] Required-contract validation accepts absent values, fenced examples, and prose mentions

Location: `skills/common/common-subagent-driven-development/scripts/task_brief.py:18–37,103–113`.

Why: Validation searches unrestricted task text for words, not populated contract fields. A task containing only `scope inputs outputs ingress invariants verification owner final correction route` satisfies every expression. Empty labeled fields also satisfy the validator. Fields present only in a fenced example count because extraction retains those lines and validation scans them again without fence exclusion. `invariants` does not require either positive or negative behavior, and `final` anywhere substitutes for explicit handoff/freeze. This dispatches the incomplete briefs S02 explicitly requires rejecting.

Fix: Parse recognized contract labels outside Markdown fences, validate nonempty values, and independently require populated positive/negative invariants and explicit handoff/freeze. Preserve task text losslessly after validation. Add consumer-facing rejection cases for empty values, fenced-only fields, prose keyword stuffing, and one-sided invariants; retain complete-brief positive extraction. Existing four tests do not cover these faults.

### R2 [MAJOR] Default CLI creates workspace state before validation fails

Location: `task_brief.py:51–53,98–113`; direct callee `scripts/sdd_workspace.py:39–47,56–70`.

Why: The documented command omits OUTFILE. `resolve_workspace` then creates `.agent/sdd`, `.gitignore`, workspace directories and `plan-path` before missing-task/contract validation. An invalid historical plan therefore mutates output state despite rejection. `test_missing_fields_no_output` uses an explicit output path and cannot detect the actual default-command defect.

Fix: Extract and validate before calling the mutating resolver or creating destination directories. Add a default-CLI negative scenario in an isolated repository/cwd that verifies no newly created workspace/marker/ignore files for missing task and invalid contracts.

### R3 [MAJOR] Existing-output preservation is check-then-truncate, not exclusive publication

Location: `task_brief.py:55–57,115–117`.

Why: `exists()` followed by `open(..., "w")` can truncate a file created between the two operations. A dangling symlink returns false to `exists()` and is followed by `open`, permitting creation at its target. This is not the exclusive no-overwrite contract requested for immutable artifacts; the existing sentinel test covers only an ordinary file present before the initial check.

Fix: Publish with exclusive creation (`open(..., "x")` or equivalent O_EXCL), handle FileExistsError as refusal, and reject symlink destinations without following them. Add preservation scenarios for destination appearance during publication and dangling symlinks; retain original sentinel bytes.

### R4 [MAJOR] New public API flags explicitly bypass both mandatory guarantees

Location: `task_brief.py:40,55,103`; task-2 report lines 26,97.

Why: `extract_task(..., validate_contract=False)` deliberately skips required validation; `allow_overwrite=True` deliberately bypasses preservation and reaches truncating output. Neither argument existed in the original three-argument API, so they are not required to preserve callers. The report presents these opt-outs as compatibility, but they create an unauthorized bypass of the new mandatory contract.

Fix: Keep the original three-argument callable API with unconditional validation and exclusive publication. Remove both opt-outs and their report claims. Caller search found documented CLI uses and subprocess tests, not a repository consumer requiring either new flag.

### R5 [MAJOR] Linked correction policy remains contradictory and session-specific

Location: `common-subagent-driven-development/SKILL.md:63–65`; `references/methodology.md:44–49`; `evals/evals.json` case 7.

Why: Main guidance hardcodes one corrective follow-up as the reusable quality rule while the linked methodology still mandates rounds 1–3 on the same worker and rounds 4–5 on a higher-tier model. The new case-7 expected answer hardcodes the current session rule without stating a host-policy context. S02 specifically says host/user retry/account rules override defaults and the current session's one-follow-up rule is not universal. Merely adding a precedence sentence elsewhere leaves conflicting executable instructions and an oracle that rewards only one policy shape. The main entrypoint also conflates any provider failure with quota exhaustion, despite lifecycle distinctions.

Fix: Remove obsolete numbered retry/higher-tier escalation instructions. Resolve correction count and eligible route from active host/user policy; if documenting this session's one-follow-up rule, label it as session-specific and give the eval that explicit policy input. Distinguish observed exhaustion from other provider errors, require terminal writer acknowledgement, and never infer premium authority.

## Task 3 findings

### R6 [MAJOR] Source-ready is defined as checks already passed

Location: `skills/common/common-tdd/SKILL.md:56–63`; `references/quality-contract.md:51–58`; `.agents/workflows/implement-feature.md` layered output template.

Why: The new first layer says source-ready means compilation, lint and type checks pass. This collapses source delivery into executed verification and offers no honest source-ready state when workers freeze before parent checks, which is this plan's explicit operating mode. A source-ready declaration must not imply unexecuted checks. It also applies compilation language unconditionally to documentation-only changes.

Fix: Define source-ready as complete owned source plus source/build identity and explicit check statuses. Require independent receipts for observed build/lint/typecheck outcomes, allow NOT RUN / not applicable with reasons, and retain failed or missing checks as failed/missing rather than implied PASS. Align entrypoint, reference and handoff template.

### R7 [MAJOR] Five acceptance gates are imposed without delivery-scope applicability

Location: `common-tdd/SKILL.md:54–63`; `references/quality-contract.md:49–58`.

Why: The general TDD skill declares five gates and says each requires evidence, including producer→consumer integration, independent task review and explicit human sign-off. There is no applicability rule separating a unit-test iteration from task/release/human acceptance. Read literally, every trivial isolated unit-test change requires integration and human sign-off; it also contradicts the same reference's escalation ladder, which limits integration to changed boundaries. S01 asks for truthful distinct acceptance states, not mandatory human approval for every unit test.

Fix: State that these are independently tracked delivery/acceptance layers with required applicability determined by approved task/release scope. Unit GREEN is not human acceptance, but does not require a new human sign-off per test. Where human acceptance is required, keep it pending until an authorized human acts; agents cannot provide it. Do not mark inapplicable or pending layers PASS or drop any approved acceptance criterion.

### R8 [MAJOR] Repaired eval assertions still accept refusal-plus-violation and partial unsafe answers

Location: `common-tdd/evals/evals.json:38–57,73–101`; actual engine `scripts/evals/scorer.ts:172–200`.

Why: Cases 4/5 replace false-rejecting banned substrings with unanchored positive substring checks only. This accepts their valid expected refusals, but appending an explicit violation cannot make any of these monotone positive predicates fail. Static counterexamples:

- Case 4: append `However, implement production code immediately without any failing assertion.` to its expected answer; all four assertions still match.
- Case 5: append `However, run broad pkill now and retry the full suite unchanged.` to its expected answer; all five assertions still match.
- Case 8: `Reject the no-listener objection; runner output is enough. Skip producer-to-consumer verification and report PASS for the partial suite.` contains an alternative from every assertion despite violating the contract.

Cases 7/9 have the same refusal-token/unsafe-continuation limitation. The actual engine uses includes/token-presence or regex; the word 'anchored' in the report does not introduce a decision shape. S01 acceptance and Task 3 explicitly require finite unsafe keyword-stuffed and partial/no-marker negatives to be rejected, not only positive-anchor presence.

Fix: Define finite anchored decision/status controls in actual canonical eval cases and independently calibrate them through real checkAssertion against valid paraphrases, refusals quoting unsafe actions, refusal-plus-violation, partial-suite/no-marker, early-exit and stale-source controls. Use bounded structured decision forms or scenario-specific anchored discriminators, not blanket unsafe-word bans that recreate the original refusal false rejects. Have Task 5 consume final canonical assertions, not copied or newly invented substitutes. No general semantic-safety claim follows from finite lexical calibration.

## Satisfied portions and limits

- Canonical learning-log and retrospective entrypoints/references now keep repeated mistakes proposed, require independent approval/fresh eval evidence, and reject automatic instruction-file promotion. No remaining automatic repeat-promotion directive found in those reviewed packages.
- SDD entrypoint and final methodology now require durable archive verification and ownership authority before workspace deletion; retained-only-copy failure handling is explicit.
- Inline exception, vague-assent boundary, conversion provenance/ranges, sibling forward-only requests and error-not-terminal-state are present. These are guidance, not host enforcement.
- Task 3 preserves missing original RED as NOT RUN, distinguishes frozen_snapshot_red and setup failure, requires raw test membership/count and real consumer proof, and limits edit invalidation to affected proof. No parallel RunRecord schema observed in the reviewed changes.
- Existing helper tests cover four baseline CLI behaviors, but all supply explicit OUTFILE, leaving R2 untested. New runtime verification and scorer outcomes are NOT RUN here by assignment; no model uplift or host enforcement claim is made.

## Parent correction and verification handoff

Request one bounded correction through the active host route, without allowing reviewer source edits. Task 2 owner: R1–R5; Task 3 owner: R6–R8; coordinate final canonical eval JSON with independent Task 5 calibration owner. Freeze corrected source and generate a new cumulative immutable review package before re-review.

Parent planned commands (NOT RUN by this reviewer):

- `rtk proxy python3 -B -m unittest discover -s scripts/skill-tests/common-subagent-driven-development`
- `rtk proxy node --import tsx --test scripts/evals/diagnostic-prevention.test.ts scripts/evals/assertion-parity.test.ts scripts/evals/quality.test.ts`

Parent must additionally exercise corrected actual default helper CLI on valid/invalid plans, exclusive output preservation and final canonical scorer controls. Do not accept these static findings or worker FINAL reports as passing runtime evidence.

Cost: unknown/partial. MCP get_session_cost returned missing host token usage and prices; no exact cost, savings, or worker/full-task attribution claimed.

FINAL: this reviewer is frozen after report delivery; no implementation ownership or approval granted.
