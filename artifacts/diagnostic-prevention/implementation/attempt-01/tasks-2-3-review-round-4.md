# Tasks 2–3 independent review — round 4

**FINAL. Task 2: Spec APPROVE / Quality APPROVE. Task 3: Spec APPROVE / Quality APPROVE.**

No remaining BLOCKER/MAJOR found in this bounded frozen correction. Approval covers reviewed source contracts and finite canonical decision-field discrimination, not whole-response semantic safety, host enforcement, release/promotion, human acceptance or model efficacy.

## Review scope and provenance

Read the cumulative `tasks-2-3-review-round-4.diff` (tool snapshot BFDB), `tasks-2-3-route2-report.md` (9042), original R1/R8 and prior closed R2–R7 dispositions, current helper B4CD, helper tests16B6, TDD E6C4, SDD4A77, learningD72D and retrospectiveC633 canonical eval files. These tool snapshot tags are not SHA-256 commitments. Source ownership and acceptance remain original task briefs, Global Constraints and S01/S02/S04. No verdict is inferred from the capacity-failed round3 attempt.

Reviewed `task-5-review-round-3.md` as separate independent finite-matrix adjudication evidence, not as a replacement for this source review. Parent identity record `canonical-oracle-inputs.json` supplies observed SHA-256 identities (not recomputed here):

- TDD: `812b77f73d050d11114d878bc3d84c158aeef9575c97d4c2fa26418f9f9a8a29`
- SDD: `63bf0d7ea566150212518772c2e49167a91a5da1f0df81a03fd56538bc9375c6`
- Learning: `de9b3f11d4f68e31766ece8a127fd74a8424ae2e4c87b7181ec62671eb722751`
- Retrospective: `d394bcfa13905ee8469e73dbf8223e23442254b4984ad946e32b5246059af48d`

Read parent verification receipt `parent-verification-checkpoint-03.json` and newly available installed consumer receipt `installed-brief-smoke-run-01.json`. No tests, builds, probes, shell checks, source edits, delegation, profile/account changes, premium or generators executed by this reviewer. Only this new report written; previous reviews retained.

Standards: retained code-review/caveman-review workflow guidance; refreshed MCP common code-review, security-audit, OWASP, LLM-security, best-practices, feedback-reporter, session-retrospective, skill-creator, workflow-writing, TDD and Python language/testing; loaded eval-assertion-hardening and sdd-revision-bound-rereview. MCP compliance audit used. Generic category warnings do not establish missing framework applicability for these files.

## Finding disposition

| Finding | Disposition | Concrete evidence |
|---|---|---|
| R1 / R1.2 — empty/prose/fenced helper contracts | CLOSED | Helper lines18–60 tracks backtick/tilde delimiter character and opening length, only closing on matching sufficiently long unadorned delimiters. Lines63–100 parse one line at a time, case-insensitively, with same-line values; lines103–135 require populated bold fields and both positive/negative invariants. Empty Inputs cannot borrow Outputs; tilde-only or mismatched-marker examples remain fenced. Tests417–475 cover individually empty values, scope absence, tilde/cross-marker/short-closer and unbolded prose rejection;477–504 retain real complete-contract and tilde-heading positives. |
| R2 — invalid default CLI workspace side effects | CLOSED, retained | Helper188–208 rejects absent task/invalid contract before resolve_workspace. Test308–326 verifies no default state on invalid contract. Installed consumer A06 reports exit5/no workspace. |
| R3 — exclusive output preservation | CLOSED, retained | Helper210–222 rejects final destination symlink and opens with `x`, handling FileExistsError; no check-then-truncate path. Tests377–409 require exit4, unchanged bytes and retained symlink. Exclusive open refuses a final symlink/file appearing after the initial inspection too. |
| R4 — bypass parameters | CLOSED, retained | Helper138 retains only `(plan_file, task_number, outfile=None)`; mandatory validation195 and exclusive publication218 have no opt-outs. |
| R5 — linked retry/account precedence | CLOSED, retained | Diff923–927 and1170–1175 resolve active host/user policy, label one-follow-up as a contextual example, remove obsolete rounds1–3/4–5, distinguish observed exhaustion from other runtime errors and forbid automatic premium. Earlier error-not-terminal rule at1161 applies before ownership transfer, including429. SDD case7 explicitly supplies current one-follow-up policy. |
| R6 — source-ready implies checks passed | CLOSED, retained | Diff1540 and1737 plus workflow51–58/82 separate delivered source identity from independently recorded PASS/FAIL/NOT RUN/N/A checks. Missing checks are not promoted to PASS. |
| R7 — per-unit human signoff | CLOSED, retained | Diff1539–1546 and1736–1743 govern applicability by approved scope, retain independent task review in structured plans, require genuine human action only for applicable human gates, and forbid N/A-as-PASS. Unit iterations do not acquire universal human signoff. |
| R8 / R8.2 — substring false pass/quoted-refusal false reject | CLOSED for declared finite decision contracts | Actual canonical 13 targeted cases now have a whole-response grammar plus three distinct outcome-value predicates. Complete ordered unique fields are required; opposite values remain shape-valid but fail corresponding outcome checks. Quoted commentary is permitted only in explicitly ungraded final NOTES. Details below. |
| R8.3 — expected answers fail v1 | CLOSED | TDD4/5 expected outputs now use the exact permitted fields/values rather than prose `redundancy`/`process group` substring dependencies. All targeted assertions are regex, so actual scorer's regex branch has the same behavior at v1/v2. Parent actual suite result supports the static inspection. |

## Task 2 source and tests

The previously observed false exit5 was a concrete case-sensitivity bug, not a bad fixture: `_CONTRACT_LABELS` uses title case while canonical template fields use `Verification owner` / `Correction route`. `_label_value` now passes `re.IGNORECASE` at70–74, so canonical and uppercase variants enter the valid path. Test345–357 explicitly exercises that compatibility. This preserves line-bounded values and does not relax empty-value or fence rejection.

`_fence_transition` is shared by extraction and validation, avoiding the previous different treatment of fenced task headings versus fenced fields. Opening, same-marker/length closure, wrong-marker and short-closer behavior is clear. Lines32–49 remain a Markdown fence recognizer, not an authority parser; validation establishes presence of populated declared fields, not truth or adequacy of free-text authority claims.

Tests no longer pin incidental stderr prose: publication refusal is exit4 plus actual preserved destination state; contract refusal is exit5 plus no output. Existing positive extraction and valid fenced examples remain reachable, so negative results are not credited through the old universal label-match failure. Stable exit codes, task boundary preservation and actual artifact bytes remain consumer-visible contracts.

Learning/retrospective canonical entrypoints and references retain proposed-only repeat learning, independent approval/fresh evidence, append-only history and durable archive prerequisites. SDD retains Inline as explicit human-selected exception, vague assent scoped to the presented choice, source provenance/inclusive ranges, worker non-nesting, sibling forward-only and writer-state rules. No new blocker in those previously reviewed linked consumers/templates.

## Task 3 and finite canonical oracle adjudication

Read all actual targeted arrays: TDD4/5/7/8/9; SDD4–9; learning5; retrospective5. Each uses four regex assertions:

1. **Shape:** fully anchored ordered field grammar admitting all listed safe/unsafe enum values and optional final single-line NOTES up to300 characters.
2. **Decision value:** exact expected value with complete line boundary.
3. **Second outcome:** exact expected value for a distinct classification/prerequisite/scope decision.
4. **Third outcome:** exact expected action/evidence/routing value.

This is not one giant safe-answer grammar disguised as multiple assertions. Shape permits a well-formed opposite action; each field predicate can independently reject a listed opposite while the remaining fields stay correct. Shape independently rejects a duplicate line, reordered/omitted field, accepted-prefix-plus-second-value or extra unlabelled tail even when all safe field occurrences are present. At least two substantive outcome checks therefore exist per targeted case without counting shape as an outcome.

Safe values follow scenario facts: unexpected green requires revision/inspection rather than implementation; hung command requires owned process group/focused bounded execution and infrastructure classification; absent original RED remains NOT_RUN with separately labeled frozen proof; partial/early-exit execution is rejected pending actual consumer evidence; later edits invalidate affected—not all—proof and require final-source rerun. SDD cases preserve recorded Inline exception, narrow assent, verified archive, active host route and terminal-state rules, no nesting and proposed-only promotion. Learning/retro require proposed-only status and archival safeguards.

The literal newline boundaries accept LF or CRLF through `\r?\n`; horizontal indentation is supported. Exact full field values reject multivalue and conflicting-duplicate graded decisions. Whole-shape anchoring rules out non-NOTES prose tails. The prior exact unsafe substring bans are absent from these targeted cases, so a refusal quoting unsafe wording in allowed NOTES does not falsely fail. Unchanged TDD6 and learning4 still use `not_contains`; no claim is made that all package negatives were removed.

**Important scope boundary:** NOTES is expressly ungraded in every affected prompt. A contrary recommendation hidden inside NOTES is therefore not adjudicated by these oracles; a correct field block plus that text may pass. Approval is for the explicit finite decision block and response grammar, not unrestricted refusal-plus-violation detection over arbitrary prose. Conflicting graded fields and unlabelled tails are rejected; no whole-response semantic safety, model uplift or runtime guardrail claim follows. This matches the independently stated Task5 limitation, rather than silently treating keyword presence as safety.

## Exercised verification — parent evidence, not rerun

`parent-verification-checkpoint-03.json` records:

- Helper/review-package suite: **29 PASS,0 FAIL,3.265s**, after the label-case repair. Earlier **28 tests:21 PASS/7 FAIL** remains historical evidence in the route2 report; it is not erased or retrospectively green.
- Actual scorer/parity/quality three-file gate: **241 PASS,0 FAIL,0 skipped,377.754ms**.
- Full `scripts/evals/*.test.ts`: **322 PASS,0 FAIL,0 skipped,726.888417ms**. These overlap; counts must not be summed.
- Scoped changed-case audit/alignment: **0 definition/alignment issues**.

`task-5-review-round-3.md` independently adjudicates actual canonical field cases and control classes, including quoted/paraphrased NOTES, conflicting duplicate, unsafe enum, missing field, unlabelled tail, and representative CRLF/order cases. This report independently checks Tasks2/3 source and actual JSON; it does not re-review or own Task5's implementation.

`installed-brief-smoke-run-01.json` is now complete and records **11 passed assertions**, teardown_success/completed/all_passed=true. It reports built CLI→loopback candidate registry→installed task_brief byte identity, successful real complete extraction, mixed-case labels, missing/prose/fenced/next-line contracts and missing-task refusal, no invalid default workspace, and preservation of explicit existing output. Source/served/installed helper SHA reported as `9f920ba09cf38cc21d43a9ec6dac42e9afc0a3d946f734fb4059c092c00e13ce`; CLI build SHA `d9b67df381372b5ddf22ae92a1b88769fb817b8f26bac33f9d7567bcce2f66f6`. These are retained parent-consumer receipt claims, not reviewer-recomputed hashes or a review of smoke-runner implementation. CLI sync assertion retains diagnostic `fatal: not a git repository` in stderr while the consumer assertions complete; do not rewrite that history as no diagnostics.

## Completion and remaining integration boundaries

R1–R8 are closed for this task-owned scope. No additional corrective source turn requested. Preserve source freeze and all failed-attempt history. Parent retains final generated mirrors/adoption, broader integration and external host gating; this review grants none of those actions and makes no root-generation readiness claim. Original pre-implementation RED remains NOT RUN; later parent checks do not manufacture historical RED.

Cost remains partial/unknown: host tokens/prices unavailable. No cost savings, human signoff, policy promotion, activation, deployment or universal test efficacy asserted.

**FINAL — reviewer frozen after delivery.**
