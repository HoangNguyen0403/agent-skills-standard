# Brief: Refit Skills And Workflows For Current Models

slug: skill-model-collaboration
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
approval: approved(requesting maintainer, 2026-11-11)
repository_status: approved_brief_saved
activation_status: not_required

SNC: S=2 N=1 C=2 total=5 tier=high (inference from repository scan, not a scouted blast radius). The capability hint authorizes no premium spend.

Relation to `docs/brd/brd-skill-system-effectiveness.md` (approved 2026-11-05): that brief owns the ROI pilot and evidence-readiness decision and is not reopened. This brief owns the content of `skills/**/SKILL.md` and `.agents/workflows/*.md`. It supplies concrete input to that brief's P1 "remediate weak outcome/activation cases" and P2 "measure context cost" rows.

## Decision Card

- **Outcome:** An expert verdict on the current skills and workflows, covering cost and wording, plus a sequenced direction for cutting and rewriting them so they add value on top of current models.
- **Verdict:** Structure is sound (every SKILL.md is within 100 lines, references are split out). Content has four problems: text written to pass the evals, rules the model already follows without the skill, the same guardrail restated across many files, and emphasis that no longer discriminates.
- **Recommendation:** Slice 1 first: remove the 122 "response anchors" sections and repair the evals that depend on them. Later slices rely on eval deltas, and those deltas are contaminated until this is done.
- **Strongest objection:** Reported with-skill pass rates will probably fall, and re-running evals needs spend that this brief does not grant.
- **Reversal condition:** If a sampled re-score shows the anchors do not change pass rates, skip to slice 3 (workflow de-duplication), which does not depend on evals.
- **Scope:** `skills/**/SKILL.md`, their `evals/evals.json`, `.agents/workflows/*.md`, and the two authoring standards.
- **Non-goals:** New skills, CLI/MCP changes, the ROI pilot, host policy, and any savings claim.
- **Impact if wrong:** A real behavior gain is deleted along with the padding. Mitigation is a snapshot before edits and a same-protocol comparison on a sample.
- **Open decisions:** (1) the first slice: settled, slice 1, by approval of the recommended default; (2) the project/account domain for the independent check that tier=high requires. The check has not been run and the domain is still unanswered.
- **Approval sought:** This brief and its slice order only. It grants no edits, eval spend, publication or release.

## You Said / I Assumed

**You said:** Review the current agent skills with their cost. Judge them as an expert. Find where to reduce or refine wording. Since models have improved, find how the skills can work with the model to give users a better outcome. Cover `skills/` and `.agents/workflows/`.

**I assumed:**

- "Costing" means context cost (bytes and tokens loaded per task), not a dollar figure. Host token usage and prices are not exposed.
- The deliverable is an assessment and a direction. No skill or workflow file is edited under this brief.
- A full read of all 354 skills is out of scope for intake. The findings rest on whole-catalog counts plus seven skills and one workflow read in full.
- Owner and approver default to the requesting maintainer.
- Success example (agent-proposed): a skill that loses its generic bullets and keeps only project decisions and a verification step scores no worse on held-out cases than the current version.
- Anti-goal (agent-proposed): cutting size to hit a byte target while a guardrail silently stops firing.

## Contract

**Outcome:** As in the Decision Card.

**Constraints:**

- Reuse the existing eval runner, scorer and snapshot procedure in `common-skill-creator`. Build no new harness.
- Guardrail skills (`guardrail: true`, 42 files) keep their behavior. Any wording change to them needs a before/after comparison on their pressure cases.
- Byte counts are measured. Token figures are chars/4 estimates unless the benchmark tokenizer produced them.
- No numeric target is set here. Every threshold below is `unknown` with proof `measure first`.

**Non-goals:** As in the Decision Card, plus: translating or reformatting references, changing the router or index format, and re-litigating the approved effectiveness brief.

**Acceptance criteria:**

1. Each finding cites a count or file that can be re-checked from the repository.
2. Each slice names its files, its proof, and what it must not change. (assumed)
3. The first slice can be planned without deciding any later slice. (assumed)
4. Nothing in the direction relies on a pass-rate or saving that has not been measured. (assumed)

## Findings

### Cost

| Item | Measured |
| --- | --- |
| SKILL.md files | 354 files, 1,088,464 bytes; median 2,550, p90 5,243, max 10,255 |
| References | 642 files, 2,378,702 bytes |
| Workflows | 39 files, 214,222 bytes; largest `sdlc.md` at 10,728 |
| Index and catalog | `index.json` 95,700; `README.md` 109,008; `AGENTS.md` 5,613 |
| Heaviest categories (SKILL.md bytes) | common 217,003; system-design 75,795; quality-engineering 70,608; marketing 60,210; product-management 58,376 |

Mean SKILL.md size is 3,075 bytes, roughly 770 tokens by chars/4. `benchmark-report.md` measured 594 tokens across 288 skills on 2026-09-23. The two figures use different methods and populations, so the growth is indicated, not measured.

One `brainstorm-feature` run loads the workflow (9,955 bytes) and three mandatory skills (9,169 + 6,555 + about 4,300), before any reference file. That is about 30 KB, roughly 7,500 tokens by chars/4, of instructions before the task is read.

### Quality

| # | Finding | Evidence | Status |
| --- | --- | --- | --- |
| F1 | 122 skills end with a "Canonical response anchors" or "Remediation anchors" section telling the model to repeat listed words. The words are the `contains` values in that skill's own evals. | 122 files, 147 hits, 30,831 bytes. In 3 of 3 skills sampled the anchors equal eval values: `kind` and `Discriminated Union` (typescript-language), `cleanup` and `recreated` (react-hooks), `80 lines` and `delete` (common-workflow-writing). | confirmed(skills/typescript/typescript-language/SKILL.md:77-81; its evals/evals.json:26,30) |
| F2 | F1 breaks the registry's own rule "No Answer-Anchor Padding". | confirmed(skills/common/common-skill-creator/SKILL.md:75) | confirmed |
| F3 | The anchors inflate the with-skill pass rate. | Follows from F1; no re-score was run. | assumed |
| F4 | Many skills restate what the model already does. In the July run, 95 of 265 skills had a delta of zero or below (16 negative), and 35 had a 100% baseline. | confirmed(evals-report.md:73-337). Protocol provenance in that run is unknown for 227 skills, and F3 applies, so treat this as a lead. | confirmed count, limited meaning |
| F5 | Generic bullets with no project decision in them, such as "Generics: Reusable, type-safe code" and "Utility Types: Partial, Pick, Omit, Record". This breaks "No Redundant Knowledge". | confirmed(skills/typescript/typescript-language/SKILL.md:31-33; skills/common/common-skill-creator/SKILL.md:58) | confirmed for the sample; catalog rate unknown |
| F6 | Priority labels do not discriminate: 178 skills are P0 (CRITICAL), 147 are P1, 29 are P2. | Whole-catalog count. | confirmed |
| F7 | The same guardrail is restated across files. The sensitive-change risk floor appears in 7 skill/workflow files and twice inside `common-task-complexity-routing` (lines 69 and 77-78). The Outcome Report JSON template is copied into 26 workflows. Not-run-is-not-pass wording is in 7 files. | Whole-catalog counts. | confirmed |
| F8 | Anti-Patterns sections restate the rules above them. `common-decision-discipline` lines 83-88 repeat sections 2 to 6. 325 skills have the section. | confirmed(skills/common/common-decision-discipline/SKILL.md:83-88) for the sample; catalog rate unknown | partly confirmed |
| F9 | The line caps are met by packing lines, so they no longer bound cost. `sdlc.md` is 79 lines at 135 bytes per line. Workflows hold 84 lines over 400 characters; SKILL.md files hold 67. | Whole-catalog counts. | confirmed |
| F10 | Packed lines chain exceptions inside exceptions. `sdlc.md` step 2 puts four tie-break rules with nested "unless", "even if" and "except" in one sentence. | confirmed(.agents/workflows/sdlc.md:16) | confirmed; effect on model behavior unknown |
| F11 | Compression has damaged the two authoring standards: "what it , when it trigger", "they one step", "every table row real structure". | confirmed(skills/common/common-skill-creator/SKILL.md:31; skills/common/common-workflow-writing/SKILL.md:25,56-57) | confirmed |
| F12 | Some triggers are single common words (`const`, `build`, `test`, `type`). Android specificity is 75% in the July run, with `android-state` at 10%. | confirmed(skills/typescript/typescript-language/SKILL.md:11-19; evals-report.md:46,95) | confirmed |
| F13 | `common-operator-profile` carries sentences that exist to satisfy string checks ("Use the literal label `SMART metric`", the "Remediation anchors" line). | confirmed(skills/common/common-operator-profile/SKILL.md:45,57-59) | confirmed |

### What works

- Progressive disclosure is in place: 252 skills link references, and no SKILL.md exceeds 100 lines.
- The skills that score well against baseline carry project-specific procedure or tool steps, for example the `getDiagnostics` verification step in typescript-language (line 70) and the quality-engineering tool skills (21% baseline, 100% with skill).
- Evidence labelling, approval scope and the risk floor are real guardrails. The problem is how often they are restated, not that they exist.

## Direction: Working With Current Models

These are the editing rules proposed for the rewrite. Each is a hypothesis until a slice measures it.

1. **Keep only the delta.** A line stays if the model would do something different without it: a project decision, a version-specific API, a default the team chose against the common one, a tool to call. Language facts go.
2. **State the decision and its reason once.** "Literal unions over `enum` because enums emit runtime code" replaces a rule plus a matching anti-pattern. Reasons let the model handle cases the rule did not list.
3. **Spend words on verification.** Commands, tool calls and checks the model cannot guess are where sampled skills beat baseline.
4. **Say each guardrail in one place.** The risk floor lives in `common-task-complexity-routing`; other files name it and link. The Outcome Report schema lives in one reference.
5. **Use emphasis only where it changes behavior.** Drop the Priority header from skills where it carries no routing meaning, and keep CRITICAL for the guardrail skills.
6. **Write full sentences in guardrails and workflows.** One rule per bullet, exceptions as sub-bullets. Budget by tokens, not lines.
7. **Retire on evidence.** A skill whose clean with-skill score does not beat baseline is shrunk to its delta or removed. Threshold: `unknown`, measure first.
8. **No text written for the scorer.** Anchors go; evals assert behavior, per `common-skill-creator` line 68.

## Slices

This spans several subsystems. Only slice 1 is proposed for planning now; the rest are candidates.

| # | Slice | Files | Proof | Must not change |
| --- | --- | --- | --- | --- |
| 1 | Remove anchor sections; replace the `contains` assertions that depend on them | 122 SKILL.md and their `evals/evals.json` | No anchors section remains; on a sample, with-skill versus snapshot scores are reported under one protocol, whatever the direction | Rule content of the skills |
| 2 | Delta-only rewrite of one category as a pattern pilot | One category, chosen from clean slice 1 results | Held-out cases score no worse than the snapshot; bytes before and after reported | Triggers, references |
| 3 | De-duplicate guardrails and the Outcome Report template across workflows and the common discipline skills; un-pack chained sentences | `.agents/workflows/*.md`, `common-decision-discipline`, `common-task-complexity-routing`, `common-operator-profile` | Pressure cases for the guardrail skills pass before and after; per-workflow load in bytes reported | Gate semantics, payload fields |
| 4 | Repair the two authoring standards and move the size budget from lines to tokens | `common-skill-creator`, `common-workflow-writing` | The standards read as complete sentences; the benchmark reports tokens against the new budget | Three-level loading model |
| 5 | Recalibrate priority labels and tighten single-word triggers | Frontmatter across the catalog | Trigger specificity re-measured for the categories below the readiness gate | Skill ids |
| 6 | Apply the pilot pattern to the remaining categories, retiring on evidence | Remaining categories | As slice 2, per category | As slice 2 |

## Options And Recommendation

| Option | Load-bearing assumption | First failure | Worst case / cost to abandon | Proof |
| --- | --- | --- | --- | --- |
| A. Slice 1 first (recommended) | Anchors affect scores, so current deltas cannot rank later work | Re-score shows no effect | Pass rates drop in the published report; revert is a snapshot restore | Sample re-score reported under one protocol; no anchors remain |
| B. Slice 2 or 6 first (prune by current deltas) | The July deltas are reliable enough to choose what to cut | A cut skill turns out to have had a real effect hidden by scoring noise | Useful rules deleted on contaminated evidence; restore from git | Held-out comparison per skill |
| C. Slice 3 first (workflows) | Per-session workflow load is the main cost users feel | A reworded gate stops firing | A guardrail regresses in consumer projects; higher cost to detect | Guardrail pressure cases before and after |

Recommendation: A, then 3 and 2 in either order. A is the cheapest to abandon and makes every later comparison trustworthy. Strongest objection and reversal condition are in the Decision Card. Evidence limit for B and C: neither was assessed beyond the counts above, and neither is called infeasible.

## Evidence

Commands run in this session: byte and line counts over `skills/` and `.agents/workflows/`; pattern counts for priority labels, anchors, section headings and restated guardrails; a delta tally over `evals-report.md` lines 73-337; anchor-versus-assertion comparison for three skills.

Files read in full: `common-decision-discipline`, `common-operator-profile`, `common-task-complexity-routing`, `common-skill-creator`, `common-workflow-writing`, `typescript-language`, `react-hooks`, `.agents/workflows/sdlc.md`, `references/brainstorm-review.md`, `docs/brd/brd-skill-system-effectiveness.md`. `evals-report.md` and `benchmark-report.md` were read in part.

Not done: no eval run, no tokenizer run, no read of the other 347 skills or 38 workflows, no check of consumer-host behavior. No canonical `docs/product/skill-model-collaboration/evidence.json` exists.

## Planner Check

- Consequential guesses: F3 is exposed as assumed and is the first thing slice 1 tests. The meaning of "costing" is exposed under I Assumed.
- Delegated to the builder: assertion wording for repaired evals, the order of categories in slice 6, the token budget figure in slice 4.
- Self-review: no placeholders; one plan (slice 1) proposed; thresholds are all `unknown`.
- Independent check (required at tier=high): NOT RUN. The policy requires an Analysis & Review profile matched to the project's account domain, and the domain for this repository is not established in the profile notes. Owner: requesting maintainer.

## Approval

approval: approved(requesting maintainer, 2026-11-11), by the reply "ok" to the Decision Card; scope: this brief and its slice order only; reopen: Slices, Options
authority: planning handoff for slice 1 only; never implementation, spend, release or runtime activation. The independent check remains NOT RUN and is carried into planning as an open prerequisite.

## Outcome Report

```json
{"schema_version": 1, "run_id": "unknown", "slug": "skill-model-collaboration", "workflow": "brainstorm-feature", "feature_status": "requirements_ready", "approval": "approved(requesting maintainer, 2026-11-11)", "started_at": null, "completed_at": null, "requirement_trace": {"brd_objectives": [], "requirements": [], "acceptance_criteria": ["AC-1", "AC-2", "AC-3", "AC-4"], "srs": []}, "completed_evidence": ["catalog size and pattern counts", "anchor-to-assertion match on 3 skills", "July eval delta tally", "7 skills and 1 workflow read in full"], "missing_evidence": ["clean re-score without anchors", "tokenizer-based load per workflow", "independent check", "catalog-wide rate for F5 and F8"], "decision_needed": ["name the account domain for the independent check"], "recommended_next_workflow": "plan-feature", "cost": {"source": "unavailable"}, "agent": {"identity": "unknown", "model": "unknown"}}
```

## Next Workflow

`plan-feature` for slice 1 (remove anchor sections, repair dependent evals). The independent check is still owed before any slice 1 edits are approved.

## Cost Report

See the session reply; host token usage and prices are not exposed to this workflow.

## Amendment 1 (approved by requesting maintainer, 2026-11-11)

Raised by the independent check on the slice 1 plan. It corrects evidence and narrows what slice 1 proves. The slice order and scope are unchanged; only these points are reopened.

- **F1 is narrower than stated.** Many anchor terms equal assertion values in the skill's own evals, not all. In a ten-skill check across ten categories, the anchors in `database-redis`, `ios-security`, `product-requirements` and the canonical list in `common-store-changelog` matched no current assertion value, and `javascript-language` matched only in part.
- **Padding size.** Sections delimited by the two headings total 28,733 bytes (reviewer's measurement). The 30,831 figure in F1 used a looser boundary and should not be reused.
- **Maintainer decision.** The paid sample re-score is deferred to a separate gated slice.
- **What slice 1 proves.** Slice 1 removes the identified scorer-coaching sections and repairs the assertions left ungrounded by that. It does not measure anchor-induced score inflation, preserved model behavior, or clean comparative efficacy. The "Proof" cells for slice 1 and option A that promise a sample re-score are replaced by the acceptance criteria in `docs/prd/prd-skill-model-collaboration.md`.
- **Ordering.** Doing slice 1 first is still reasonable: it removes an explicit breach of the authoring standard and a known confound. The evidence does not show that it must precede the workflow work (slice 3), or that the July eval deltas become trustworthy afterwards.
- **Independent check.** Run; see the plan's Independent Check section. The Planner Check line that records it as NOT RUN is superseded.

Amendment approval: the requesting maintainer replied "ok" to the revision-3 approval request, accepting this amendment and the bounded generated-output default. Authority extends to readiness assessment only; no implementation, model spend, release or publication. The Personal account domain is settled, and the independent reviews of plan revisions 1 and 2 are complete. These facts supersede the earlier outstanding-domain and NOT RUN statements; revision 3 was not independently re-checked.
