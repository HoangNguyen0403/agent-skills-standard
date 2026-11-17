# Task List: Agent Review Trust

slug: agent-review-trust
plan: [prd-agent-review-trust.md](../prd/prd-agent-review-trust.md), revision 2
status: Fable 5.2 technical APPROVE for revision-2 plan; Subagent-Driven implementation remains conditional on milestone design/readiness; no implementation source edits yet

Every task follows the brief contract in `skills/common/common-subagent-driven-development/references/templates.md` section 0, plus the `Gate / rollback` field this plan introduces. Capability hints (`fast | standard | strong`) are requests only; host profiles are resolved at dispatch and recorded in the dispatch receipt, not here.

## Shared Contracts

All shared contracts require milestone-scoped `design-solution` and readiness before their implementation: C2/C3/C4 for M1; C1/C5 for M2; C6 and launch-audit outcomes for M3. Accepted human safety decisions are constraints, not choices the designer may weaken.

**C1 Vocabulary (provisional).**

- `change_class`: `trunk | shared | leaf | unclassified`, derived from the Criticality Map (`| Class | Glob | Reason |`) in `docs/review-policy.md` at the independently selected Git base. Highest class wins. Classify both old and new rename paths. Unmapped paths are shared; missing base policy/map is unclassified and never lowers current review.
- `reversibility`: `gated | revertible | one-way`, parsed from C2. Gated means named flag/version pin with unchanged control; revertible means a revert restores behavior without data/contract residue; one-way covers irreversible residue or external effects.
- `review_level`: without an independently owner-approved policy/grant, `not-assessed` means current human review remains in force. Trunk, sensitive or one-way always requires line-review. Owner-granted hunk-review is a minimum-attention list including every reviewer nomination and every file with findings, never a restriction on additional reading. Report-only requires leaf, reversible, complete independently checked M3 evidence, owner thresholds and explicit owner grant; disabled throughout this implementation.
- Policy file, gate implementation and CODEOWNERS are immutable trunk controls for classification, even if policy content says otherwise. Mixed-class changes take the strongest obligation; generated integrity files remain trunk, with no automatic exception. Design records their tier consequences rather than silently lowering a floor.
- Human merge approval remains universal. Class/reversibility never lower SNC; trunk forces Centrality 2. Missing policy retains existing human obligations.

**C2 Brief field (design confirms grammar).** `**Gate / rollback:** <named flag/version pin | none: justified reason>; control: <nonempty invariant>; rollback: <revert | flag off | one-way>; reversibility: <gated | revertible | one-way>[; authorization: <human reference>]`. Outside fences, one populated same-line field. Reject bare none, missing segments, inconsistent rollback/reversibility and one-way without human authorization. `flag off` maps to gated, `revert` to revertible, and one-way to one-way; version-pin rollback can name the prior pin inside the revert action. Applies to every existing SDD brief including brief-mode tasks, not to unrelated tasks that need no SDD document.

**C3 Review phases (DD-1 boundary).**

1. Blind: provide only brief, cumulative diff and an orchestrator-observed deterministic-check receipt (command, exit, raw evidence, revision and dirty identity); author-reported status is not admissible. Record findings to a phase-one artifact and freeze its SHA-256 before any author claims are supplied. This is a declared protocol, not a filesystem access-control claim.
2. Reproduce: only with verified provenance AND host-verified isolated runtime without credentials or publication authority AND a command published by the orchestrator in the brief. Never execute author-controlled commands in a privileged reviewer runtime. Otherwise remain static, record a scoped gap and never claim reproduction PASS. Compare against the orchestrator-observed result; later author-claim mismatches are Blockers too.
3. Reconcile: resume the same reviewer with frozen phase-one artifact/digest and author report, then compare claims. If same-reviewer resume is unsupported, reconciliation is BLOCKED; do not fake continuity or approve from a new reviewer without restarting the complete blind protocol.

Finding format: `[Blocker|Major|Nit] file:line`, then `Why:`, `Fix:`, and `Prevent-by: lint | type | test | eval | runtime | guidance | none`. No praise section.

**C4 Delivery Report decision block.** Verdict (`READY | NOT READY | BLOCKED`); human action; review level and basis (M1: `not-assessed; current human review applies`); minimum-attention hunks; criteria with required/applicable status and proof; verified/not verified; gate/rollback; findings; frozen blind-phase identity; reproduction or explicit gap; residual risk. A READY claim never hides FAIL/NOT RUN/BLOCKED required criteria. Eval-structure checks cannot prove agent compliance.

**C5 Gate and sidecar (design required).** Standard-library `skills/common/common-review-policy/scripts/review_gate.py`.

- `classify --policy <repo-relative-path> (--paths <path>... | --base <ref> [--head <ref>]) [--json]`: descriptive result exit 0, malformed/usage exit 2. Explicit-path mode may inspect a candidate policy for authoring smoke only and never approves a report.
- `check --report <json> --policy <repo-relative-path> --base <ref>`: resolve policy from the trusted base blob, never working-tree changes. Git independently supplies current HEAD, cumulative base-to-workspace changed paths/hunks including staged, unstaged, untracked, and both rename endpoints; compute dirty-content identity, excluding only exact report/evidence artifacts with explicit non-source scope. Verify against frozen report identities; later source changes refuse. Exit 1 for named refusals, 2 for malformed input, 0 for consistency only.
- Sidecar v1: source identities; verdict; class/reversibility/review level; declared actors; approved criterion inventory reference/digest with every criterion's required/applicable status and proof path/digest; blind_phase (artifact/digest, frozen-before-reconcile receipt); orchestrator check receipt; reviewer_reproduced (command/claimed/observed) or reproduction_gap; findings; human_attention (path and diff hunk identity/range); parsed gate fields; policy/grant and calibration evidence references. Design pins path containment and source/evidence separation.
- Refuse missing or changed phase-one proof, absent reproduction without explicit gap, and any claim/result mismatch not recorded as a blocking finding. A reproduction gap prevents any claim that reproduction passed; whether a criterion requires execution is taken from the approved criterion inventory, not the report author.
- Actors, grant and chronology references remain declarations; no local script authenticates them. Human independently validates any future grant against complete M3 evidence; no report-only grant is created by this implementation.

**C6 Trust metrics (design required before Task 10).** Extend the authorized local observations export without redefining existing human `acceptance`. Required design outputs: a revision-bound agent-review event/approval population; human findings joined to that population; an independent seeded-review population unrelated to accepted/merged changes; deployment-to-change/class join for escapes; explicit `unknown` bucket for missing class; per-kind time windows, complete coverage, domain identities, replay/conflict behavior and denominator definitions; reviewer provider/model/effort or unknown on seeds. Every rate reports sample, coverage, source and limitations. Missing or incomplete coverage is unavailable, not zero. Define a fresh escape as an observed defect on a class with an active grant after that grant's evidence cutoff; suspend the affected grant pending owner decision, never lower an existing stronger floor.

## Order

| Wave | Tasks | Condition |
| --- | --- | --- |
| M1 wave 1 | 1, 2, 3 in parallel | Plan technical approval plus C2/C3/C4 design and readiness; disjoint owned paths |
| M1 wave 2 | 4 | Tasks 1-3 frozen; workflows point at their references |
| M1 wave 3 | 5 | Task 4 frozen |
| M2 wave 1 | 6, then 7 | M1 accepted source checkpoint, no merge authority implied; C1/C5 design and readiness; Task 7 reads Task 6 grammar |
| M2 wave 2 | 8 | Tasks 6 and 7 frozen |
| M2 wave 3 | 9 | Task 8 frozen |
| M3 wave 1 | 10, 11 in parallel | M2 accepted source checkpoint; C6 and launch outcome design/readiness |
| M3 wave 2 | 12 | Task 11 frozen |
| M3 wave 3 | 13 | Tasks 10 and 12 frozen |

Each milestone ends with a separate whole-branch reviewer plus relevant architecture-guard/security-reviewer lenses. No agent supplies human acceptance. Milestone PRs remain PR-ready artifacts until separately authorized publication/merge; subsequent local work may use a technically reviewed source checkpoint. Eval-lane ACs stay NOT RUN absent an approved live run; offline preflight never closes them.

## Milestone 1: Review Quality

### Task 1: Adversarial review protocol in the code-review skill

**Files:** `skills/common/common-code-review/SKILL.md`, `skills/common/common-code-review/references/adversarial-review.md` (new), `skills/common/common-code-review/references/output-format.md`, `skills/common/common-code-review/references/orchestration.md`, `skills/common/common-code-review/evals/evals.json`
**Scope / owned write set:** these five files only; orchestration section 2 runtime boundary only (Task 6 later owns section 1).
**Inputs:** design-confirmed C3; AC-ART-02, AC-ART-03, AC-ART-12; existing privileged runtime prohibition.
**Outputs:** blind-first protocol, isolated reproduction predicate, static-check receipt admission, severity/prevention format and eval cases; reconcile orchestration section 2 with DD-1 without weakening the privileged-runtime prohibition.
**Real Ingress:** MCP `get_skill(category="common", name="common-code-review")` returning the changed body, and the new eval prompts.
**Invariants:**
- Positive: reproduction only under all C3 prerequisites; failing orchestrator-observed current check receipt yields CHANGES REQUESTED before lens review; unknown status stays a gap.
- Negative: never execute author-controlled commands in privileged reviewer runtime; unverified isolation stays static; no praise or extra severity; SKILL.md at most 100 lines.
**Gate / rollback:** none: local candidate only, consumer ref advancement requires separate release; control: preserve applicable existing eval contracts; rollback: revert; reversibility: revertible
**Verification owner:** implementer focused checks via `rtk pnpm validate` and `rtk pnpm check-alignment`
**Handoff / freeze:** report `task-1-report.md` marked FINAL; source freeze precedes review.
**Correction route:** host ladder: 1 corrective follow-up naming the failed AC, then the next authorized route; no automatic premium.

- [ ] Write the C3 reference and reconcile orchestration section 2; diversity preferences never override host profile/account policy.
- [ ] Update `SKILL.md` principles and output format in place; add the `Prevent-by` line; point to the new reference.
- [ ] Align `output-format.md` with the finding format in C3.
- [ ] Add the three eval cases; keep earlier applicable cases.

Size: M, confidence medium. Capability hint: standard.

### Task 2: Blind review dispatch, gate field and Delivery Report in the SDD skill

**Files:** `skills/common/common-subagent-driven-development/SKILL.md`, `skills/common/common-subagent-driven-development/references/templates.md`, `skills/common/common-subagent-driven-development/references/methodology.md`, `skills/common/common-subagent-driven-development/references/delivery-report.md` (new), `skills/common/common-subagent-driven-development/scripts/task_brief.py`, `skills/common/common-subagent-driven-development/evals/evals.json`, `scripts/skill-tests/common-subagent-driven-development/test_task_brief.py`, `scripts/skill-tests/common-subagent-driven-development/test_review_dispatch.py` (new)
**Scope / owned write set:** these eight files only; other SDD scripts unchanged.
**Inputs:** design-confirmed C2/C3/C4; AC-ART-01, AC-ART-06, AC-ART-08; accepted D1/DD-1/DD-2.
**Outputs:** blind/reconcile dispatch templates with orchestrator-check input and frozen phase-one proof; blocked unsupported-resume behavior; parsed C2 validation and rejection cases; M1 report defaults to current human review. Deterministic dispatch-template test excludes author-report placeholders and requires phase-one proof before reconciliation; evals remain structurally checked, behavior NOT RUN absent live authorization.
**Real Ingress:** `python3 skills/common/common-subagent-driven-development/scripts/task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON>` against a plan with and without the field.
**Invariants:**
- Positive: complete consistent C2 publishes a packet; justified none is accepted; first dispatch includes brief/diff/orchestrator receipt but not author report; reconciliation references frozen phase-one proof.
- Negative: missing/empty/fenced-only field, bare none, missing control/rollback/reversibility, inconsistent mapping or one-way without human reference exits 2 without publication; unsupported resume is BLOCKED; SKILL.md at most 100 lines.
**Gate / rollback:** none: candidate contract change not released; control: existing tests pass with complete migrated C2 fixtures; rollback: revert; reversibility: revertible
**Verification owner:** implementer via `rtk proxy python3 -B -m unittest discover -s scripts/skill-tests/common-subagent-driven-development -p 'test_*.py' -v`, then scoped validation
**Handoff / freeze:** report `task-2-report.md` marked FINAL; source freeze precedes review.
**Correction route:** host ladder: 1 corrective follow-up naming the failed AC, then the next authorized route; no automatic premium.

- [ ] RED: cover every C2 rejection plus justified-none success and phase-one dispatch/reconciliation contract; observe actual behavioral RED for the parser before implementing.
- [ ] GREEN: parse and validate C2 semantic segments, not just label presence; update owned active fixtures/examples to the same grammar. Plan briefs already carry C2 and are outside this worker's write set.
- [ ] Rewrite templates sections 0, 2 and 3; add the Delivery Report decision block to the implementer report format by reference.
- [ ] Write `delivery-report.md`; update `SKILL.md` and `methodology.md` in place; add the two eval cases.

Size: L, confidence medium. Capability hint: standard.

### Task 3: Gate planning reference and pull request template

**Files:** `skills/product-management/product-requirements/references/feature-slicing.md`, `skills/common/common-git-collaboration/SKILL.md`, `skills/common/common-git-collaboration/references/pr-template.md` (new), `skills/common/common-git-collaboration/evals/evals.json`, `skills/specialists/specialist-pr-reviewer/`, `.github/pull_request_template.md`
**Scope / owned write set:** the paths above only. No workflow and no generated mirror under `.claude/`, `.codex/` or `.github/copilot-agents/`.
**Inputs:** design-confirmed C2 reversibility grammar and C4; AC-ART-07, AC-ART-09. No provisional M2 classification dependency.
**Outputs:** a slicing section requiring gate, control invariant and rollback per slice with the three reversibility values; a portable PR template with evidence, blast radius, rollback and not-verified sections kept short; the same sections in this repository's template; `specialist-pr-reviewer` reports each missing section; one eval case for AC-ART-09.
**Real Ingress:** MCP `get_skill(category="common", name="common-git-collaboration")`, and the specialist's eval prompt for a PR with unfilled sections.
**Invariants:**
- Positive: a slice with no gate still passes when it states `none` with a reason and a rollback; the specialist names every missing template section.
- Negative: no project-specific flag tool, account or environment in reusable text; the template stays shorter than a screen and holds no pre-filled example data.
**Gate / rollback:** none: guidance/template changes only; control: existing slicing taxonomy unchanged; rollback: revert; reversibility: revertible
**Verification owner:** implementer focused checks via `rtk pnpm validate` and `rtk pnpm check-alignment`
**Handoff / freeze:** report `task-3-report.md` marked FINAL; source freeze precedes review.
**Correction route:** host ladder: 1 corrective follow-up naming the failed AC, then the next authorized route; no automatic premium.

- [ ] Add the gate and rollback section to `feature-slicing.md`.
- [ ] Write `pr-template.md`; point to it from the git-collaboration skill; add the eval case.
- [ ] Update the specialist's completeness check and this repository's template.

Size: M, confidence high. Capability hint: fast.

### Task 4: Workflow edits for review quality

**Files:** `.agents/workflows/code-review.md`, `.agents/workflows/implement-feature.md`, `.agents/workflows/plan-feature.md`, `.agents/workflows/implementation-readiness.md`, `.agents/workflows/retro-learn.md`, `.agents/workflows/dev-fix.md`
**Scope / owned write set:** the six canonical workflow files only. Generated workflow exports are Task 5.
**Inputs:** frozen outputs of Tasks 1-3; plan AC-ART-07, AC-ART-08, AC-ART-12; line caps in `scripts/audit-sdlc.ts`.
**Outputs:** code-review consumes orchestrator-observed check status before lenses, carries Prevent-by and reconciles its privileged-runtime execution prohibition with C3 isolation; implement-feature uses frozen C3 receipts and C4 with current-review default; planning/readiness carry parsed C2; retro consumes Prevent-by; dev-fix references the PR template.
**Real Ingress:** MCP `get_workflow(name)` for each edited workflow, and `rtk pnpm audit:sdlc`.
**Invariants:**
- Positive: every edited workflow stays within its audited cap and keeps its Runtime Contract, Handoff Payload, Blocking Questions and Next Workflow sections.
- Negative: preserve Outcome mappings, frontmatter, route arrows and existing handoff fields; no new brief-mode document/intake requirement, but existing SDD briefs carry accepted C2; no authority moves.
**Gate / rollback:** none: local canonical workflow candidate; control: routing and evidence-lane separation unchanged; rollback: revert; reversibility: revertible
**Verification owner:** implementer focused checks via `rtk pnpm audit:sdlc` and `rtk pnpm test:sdlc`
**Handoff / freeze:** report `task-4-report.md` marked FINAL with before and after line counts per file; source freeze precedes review.
**Correction route:** host ladder: 1 corrective follow-up naming the failed AC, then the next authorized route; a file that cannot fit its cap returns to the maintainer.

- [ ] Record before line counts; edit each file in place, replacing text rather than adding lines where a file is at its cap.
- [ ] Run the two checks; record after line counts.

Size: M, confidence medium. Capability hint: standard.

### Task 5: Milestone 1 integration

**Files:** generated exports under `.claude/`, `.codex/`, `.github/`, `.agents/skills/`; `skills/metadata.json`, `skills/index.json`, `skills/README.md`, `skills/*/_INDEX.md`; `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/sdlc-workflow-quick-reference.md`
**Scope / owned write set:** generator-produced outputs through the generator only, plus hand-written edits to the three documentation files. No hand edit to any mirror.
**Inputs:** frozen outputs of Tasks 1-4; CONTRIBUTING section 9.
**Outputs:** regenerated exports and token metrics; documentation describing C2, C3 and C4; a gate receipt for AC-ART-18.
**Real Ingress:** `rtk pnpm generate-indices`, then `node --import tsx scripts/generation/index.ts --check`.
**Invariants:**
- Positive: the generation check passes; the offline eval preflight passes for every changed skill.
- Negative: no check is weakened or skipped silently; an unrun check is reported NOT RUN; no live eval, commit, tag or release.
**Gate / rollback:** none: derived candidate files only; control: unrelated exports unchanged; rollback: revert; reversibility: revertible
**Verification owner:** parent orchestrator via the CONTRIBUTING section 9 command list plus `rtk pnpm evals:preflight` for the changed skills
**Handoff / freeze:** report `task-5-report.md` marked FINAL with each command and its result; freeze precedes the whole-branch review.
**Correction route:** a failing gate returns to the task that owns the failing source with the failing output; no automatic premium.

- [ ] Regenerate, run the check, run the gate list, update the three documents.

Size: S, confidence medium. Capability hint: fast.

## Milestone 2: Class-Based Gate

### Task 6: Change class, review level and trust calibration in policy and routing

**Files:** `skills/common/common-review-policy/SKILL.md`, `skills/common/common-review-policy/references/review-policy-template.md`, `skills/common/common-review-policy/references/trust-calibration.md` (new), `skills/common/common-review-policy/evals/evals.json`, `skills/common/common-task-complexity-routing/SKILL.md`, `skills/common/common-task-complexity-routing/references/routing-table.md`, `skills/common/common-task-complexity-routing/evals/evals.json`, `skills/common/common-code-review/references/orchestration.md`
**Scope / owned write set:** the eight files above only.
**Inputs:** contract C1 as confirmed by `design-solution`; decision D2; plan AC-ART-05, AC-ART-11, AC-ART-13.
**Outputs:** policy template includes criticality, explicit owner-granted review levels and calibration references with owner-set thresholds; trust-calibration describes independent seed cohort and spot audits. Preserve absent-policy defaults, immutable trunk controls and generated-trunk floors; report-only stays disabled pending DD-3. Recurring Blockers route through retro mechanism order; routing and orchestration section 1 respect strongest mixed-class obligations.
**Real Ingress:** MCP skill retrieval and the new eval prompts; live behavior stays NOT RUN absent authorization.
**Invariants:**
- Positive: trunk, one-way and sensitive scope require line-review; post-grant escape suspends report-only while preserving any stronger current rule; no grant may cite nonexistent pre-M3 metrics.
- Negative: no agent grants or authenticates an owner decision; no invented thresholds; no tier downgrade; no seed merge; skill caps hold.
**Gate / rollback:** none: no review-level grant is activated; control: separation of duties and absent-policy defaults unchanged; rollback: revert; reversibility: revertible
**Verification owner:** implementer focused checks via `rtk pnpm validate` and `rtk pnpm check-alignment`
**Handoff / freeze:** report `task-6-report.md` marked FINAL; source freeze precedes review.
**Correction route:** host ladder: 1 corrective follow-up naming the failed AC, then the next authorized route; no automatic premium.

- [ ] Extend the policy template and write `trust-calibration.md`.
- [ ] Update both skills in place and the routing reference; fix section 5 routing; add eval cases.
- [ ] Add the trunk elevation line to `orchestration.md` section 1.

Size: M, confidence medium. Capability hint: strong.

### Task 7: `review_gate.py` classify and check

**Files:** `skills/common/common-review-policy/scripts/review_gate.py` (new), `scripts/skill-tests/common-review-policy/test_review_gate.py` (new), `skills/common/common-subagent-driven-development/references/delivery-report.md`, `skills/common/common-subagent-driven-development/SKILL.md`
**Scope / owned write set:** the four files above only. In the SDD skill, only the sidecar description and the one line that invokes the gate before handoff.
**Inputs:** contract C5 as confirmed; the policy grammar frozen by Task 6; plan AC-ART-04, AC-ART-16.
**Outputs:** the script with both subcommands; tests covering every classify outcome and every refusal case; the `delivery-report.json` sidecar documented beside the C4 block.
**Real Ingress:** `python3 skills/common/common-review-policy/scripts/review_gate.py classify ...` and `... check ...` run from a repository root against a temporary git repository in tests.
**Invariants:**
- Positive: check derives current HEAD/dirty-content identity and complete changed paths/hunks itself, loads base-policy bytes, includes both rename endpoints, compares required criteria against the approved inventory, and requires phase-one proof plus reproduction or explicit gap; zero exit is consistency, not authenticated approval.
- Negative: exit 1 with a named reason for same actor; source identity mismatch; missing/changed/escaping evidence or phase-one proof; missing inventory criterion; READY with required FAIL/NOT RUN/BLOCKED or unjustified NOT APPLICABLE; open Blocker/Major; unreported claimed/observed mismatch; absent reproduction and gap; one-way without line-review; omitted trunk hunk or finding-bearing file; rename out of trunk downgraded; altered working-tree policy used as authority; report-only without leaf/reversible/base-policy owner grant and complete independently checked M3 evidence. Policy, gate and CODEOWNERS changes always force trunk. No repository writes/network/actor authentication.
**Gate / rollback:** none: checker is inert until invoked; control: other SDD scripts unchanged; rollback: revert; reversibility: revertible
**Verification owner:** implementer via `rtk proxy python3 -B -m unittest discover -s scripts/skill-tests/common-review-policy -p 'test_*.py' -v`
**Handoff / freeze:** report `task-7-report.md` marked FINAL with raw test counts; source freeze precedes review.
**Correction route:** host ladder: 1 corrective follow-up naming the failed AC, then the next authorized route; no automatic premium.

- [ ] RED: test each refusal and clean success, self-edited policy, rename source/destination, dirty/staged/untracked identity changes, required-criterion omission, full trunk-hunk coverage, blind proof and reproduction-gap cases in temporary Git repos.
- [ ] GREEN: implement C5; classify globs `*`/`**` and directory rows; policy control paths cannot be relaxed; derive identity from Git/content instead of comparing caller declarations alone.
- [ ] Document the sidecar and add the invocation line to the SDD skill section 5.

Size: L, confidence medium. Capability hint: standard.

### Task 8: Consumer wiring and this repository's policy

**Files:** `.agents/workflows/code-review.md`, `.agents/workflows/implement-feature.md`, `docs/review-policy.md` (new)
**Scope / owned write set:** the three files above only.
**Inputs:** frozen outputs of Tasks 6 and 7; `.github/CODEOWNERS` as the source for trunk rows; plan AC-ART-17.
**Outputs:** consumers use base-policy classification and gate result; project policy includes policy file, gate implementation and CODEOWNERS as forced trunk plus existing security/workflow/transformer/integrity rows; no report-only or hunk-review grant is activated. Generated integrity files remain trunk and tier consequences are documented.
**Real Ingress:** `python3 skills/common/common-review-policy/scripts/review_gate.py classify --policy docs/review-policy.md --paths .github/workflows/ci.yml`
**Invariants:**
- Positive: the command above prints `trunk`; a path under `website/` that no row names prints `shared`.
- Negative: the policy grants `report-only` to no class; both workflows stay within their caps; no approval authority moves.
**Gate / rollback:** none: local policy candidate grants no reduced review; control: CODEOWNERS path review never reduced; rollback: revert; reversibility: revertible
**Verification owner:** parent orchestrator via the ingress command, `rtk pnpm audit:sdlc` and `rtk pnpm test:sdlc`
**Handoff / freeze:** report `task-8-report.md` marked FINAL; the policy content is frozen for maintainer review before integration.
**Correction route:** host ladder: 1 corrective follow-up naming the failed AC; policy content disputes go to the maintainer.

- [ ] Draft the policy from the template; run both classify checks.
- [ ] Edit the two workflows in place.

Size: S, confidence high. Capability hint: standard.

### Task 9: Milestone 2 integration

**Files:** generated exports and indices as in Task 5; `.github/workflows/ci.yml`; `ARCHITECTURE.md`, `CONTRIBUTING.md`
**Scope / owned write set:** generator outputs through the generator; one CI step that runs the Task 7 test directory; the two documentation files.
**Inputs:** frozen outputs of Tasks 6-8; decision D4.
**Outputs:** regenerated exports; the new Python tests run in CI beside the existing skill tests; an architecture decision entry for C1 and C5 including the declaration-not-enforcement limit; a gate receipt for AC-ART-18.
**Real Ingress:** `rtk pnpm generate-indices`, then `node --import tsx scripts/generation/index.ts --check`.
**Invariants:**
- Positive: the generation check and the full gate list pass.
- Negative: `review_gate.py check` is not added as a required CI check unless D4 says so; the CI change adds a test step only and alters no permission, trigger or secret.
**Gate / rollback:** none: derived files and test step only; control: existing CI permissions/triggers/jobs unchanged; rollback: revert; reversibility: revertible
**Verification owner:** parent orchestrator via the CONTRIBUTING section 9 command list plus `rtk pnpm evals:preflight` for the changed skills
**Handoff / freeze:** report `task-9-report.md` marked FINAL; `.github/workflows/ci.yml` is a trunk path and needs maintainer line review.
**Correction route:** a failing gate returns to the owning task with the failing output; no automatic premium.

- [ ] Add the CI step, regenerate, run the gate list, update the documents.

Size: S, confidence medium. Capability hint: fast.

## Milestone 3: Trust And Launch

### Task 10: Per-class trust measures

**Files:** `scripts/metrics/delivery.ts`, `scripts/metrics/delivery.test.ts`, `scripts/metrics/types.ts`, `scripts/metrics/report.ts`, `scripts/metrics/report.test.ts`, `skills/common/common-sdlc-metrics/SKILL.md`, `skills/common/common-sdlc-metrics/references/metrics-schema.md`, `skills/common/common-sdlc-metrics/evals/evals.json`
**Scope / owned write set:** the eight files above only. No control-band definition and no existing history artifact.
**Inputs:** contract C6 as confirmed; plan AC-ART-10.
**Outputs:** C6 agent-review, human-finding, seeded-review and deployment/class linkage contracts through validation to per-class rates; preserve unknown bucket and old exports; schema/skill document distinct populations and evidence limits.
**Real Ingress:** `rtk pnpm metrics:report --json` against a fixture export.
**Invariants:**
- Positive: each rate reports the correct C6 population, denominator, sample, reviewer configuration where applicable, per-kind complete coverage and source; seeded packages need no acceptance/merge event.
- Negative: missing/partial coverage unavailable, never zero; no silent exclusion of unknown class; malformed/conflicting replay rejects the export; old metrics unchanged for old exports; no control-band enrollment or automatic grants.
**Gate / rollback:** none: new observation kinds are optional; control: existing metrics values unchanged for old exports; rollback: revert; reversibility: revertible
**Verification owner:** implementer focused tests via `rtk pnpm test:metrics`
**Handoff / freeze:** report `task-10-report.md` marked FINAL with raw test counts; source freeze precedes review.
**Correction route:** host ladder: 1 corrective follow-up naming the failed AC, then the next authorized route; no automatic premium.

- [ ] RED: agent-review denominator, seed cohort outside acceptance, deployment-class joins, unknown bucket, per-kind coverage gaps, identity conflicts/replays and reviewer configuration; tests bind every design-defined rate.
- [ ] GREEN: extend validation and derivations; update the schema reference, skill and eval case.

Size: L, confidence medium. Capability hint: standard.

### Task 11: Launch audit reference

**Files:** `skills/common/common-project-verification/SKILL.md`, `skills/common/common-project-verification/references/launch-audit.md` (new), `skills/common/common-project-verification/evals/evals.json`
**Scope / owned write set:** the three files above only.
**Inputs:** plan AC-ART-14; existing kit contract and maintenance references.
**Outputs:** four applicable fresh-context lanes (journeys, abnormal states, changed hot-path performance, input/permission security), explicit required/applicable inventory and consolidated PASS/FAIL/BLOCKED/NOT APPLICABLE with reasons. NOT RUN names an execution gap and maps required scope to BLOCKED, never PASS.
**Real Ingress:** MCP skill retrieval and eval prompt; no structure-only claim of model or runtime behavior.
**Invariants:**
- Positive: required FAIL prevents technical PASS; required NOT RUN is BLOCKED with owner/gap; justified inapplicable lane does not block.
- Negative: no unhealthy/unowned driving, project secrets in guidance, inherited implementer narrative, or UAT route with required failed/missing proof.
**Gate / rollback:** none: verification guidance only; control: doctor/ownership/freshness unchanged; rollback: revert; reversibility: revertible
**Verification owner:** implementer focused checks via `rtk pnpm validate` and `rtk pnpm check-alignment`
**Handoff / freeze:** report `task-11-report.md` marked FINAL; source freeze precedes review.
**Correction route:** host ladder: 1 corrective follow-up naming the failed AC, then the next authorized route; no automatic premium.

- [ ] Write the reference, add the pointer and the eval case.

Size: S, confidence high. Capability hint: fast.

### Task 12: Workflow edits for launch audit and staged exposure

**Files:** `.agents/workflows/verify-work.md`, `.agents/workflows/sdlc.md`, `.agents/workflows/deploy-release.md`
**Scope / owned write set:** the three canonical workflow files only.
**Inputs:** frozen output of Task 11; plan AC-ART-14, AC-ART-15.
**Outputs:** verify-work carries launch-lane results for medium/high features; required FAIL routes to remediation and required missing proof to BLOCKED, never UAT. Only applicable PASS plus justified inapplicable lanes can route to uat-signoff. Deploy-release stages declared gates within existing release authority and guardrails.
**Real Ingress:** MCP `get_workflow(name)` for each file, and `rtk pnpm audit:sdlc`.
**Invariants:**
- Positive: a release with no declared gate follows the existing path unchanged.
- Negative: low tier and `brief` work gain no mandatory lane; a launch audit result never grants business acceptance or release authority; caps and required sections hold.
**Gate / rollback:** none: workflow source candidate only; control: technical/acceptance/release authority separation unchanged; rollback: revert; reversibility: revertible
**Verification owner:** implementer focused checks via `rtk pnpm audit:sdlc` and `rtk pnpm test:sdlc`
**Handoff / freeze:** report `task-12-report.md` marked FINAL with before and after line counts; source freeze precedes review.
**Correction route:** host ladder: 1 corrective follow-up naming the failed AC; a file that cannot fit its cap returns to the maintainer.

- [ ] Edit the three files in place and run the two checks.

Size: S, confidence medium. Capability hint: standard.

### Task 13: Milestone 3 integration

**Files:** generated exports and indices as in Task 5; `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/sdlc-workflow-quick-reference.md`
**Scope / owned write set:** generator outputs through the generator; the three documentation files.
**Inputs:** frozen outputs of Tasks 10-12.
**Outputs:** regenerated exports; documentation of C6 and the launch audit; a gate receipt for AC-ART-18.
**Real Ingress:** `rtk pnpm generate-indices`, then `node --import tsx scripts/generation/index.ts --check`.
**Invariants:**
- Positive: the generation check and the full gate list pass.
- Negative: no trust figure, recall figure or savings claim is written anywhere without measured observations behind it.
**Gate / rollback:** none: derived candidate files only; control: unrelated exports unchanged; rollback: revert; reversibility: revertible
**Verification owner:** parent orchestrator via the CONTRIBUTING section 9 command list plus `rtk pnpm evals:preflight` for the changed skills
**Handoff / freeze:** report `task-13-report.md` marked FINAL; freeze precedes the whole-branch review.
**Correction route:** a failing gate returns to the owning task with the failing output; no automatic premium.

- [ ] Regenerate, run the gate list, update the documents.

Size: S, confidence medium. Capability hint: fast.
