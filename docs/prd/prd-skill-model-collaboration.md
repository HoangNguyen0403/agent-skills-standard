# Feature Plan: Remove Eval-Anchor Padding From Skills (Slice 1)

slug: skill-model-collaboration
operator_profile: technical
lane: direction
snc_tier: high (initiative); slices scored separately below
delivery_mode: standard
approval: approved(requesting maintainer, 2026-11-11), revision 3; readiness assessment only
revision: 3 (2026-11-11, after the independent re-check; revision 3 itself has not been re-checked)
source: `docs/brd/brd-skill-model-collaboration.md`, approved(requesting maintainer, 2026-11-11), slice 1 only, with its Amendment 1

## Decision Brief

- **Changes since revision 1:** An independent check returned "not ready" with two blockers and six further findings. All eight are addressed here; see Independent Check.
  - Seven skills hold both a real "Core Rule Anchors" section and a padding section. Those files are edited; only their Core Rule Anchors sections are protected.
  - Evals are no longer rewritten wholesale. Only assertions that lose their grounding when the section is removed are repaired, and negative assertions are never converted.
  - The repository's generator is run at integration, so derived files and the installed copies it writes are part of the change set. Revision 1 excluded them, which the pre-commit hook would have rejected.
  - Two checks were added to the gates, and gate comparison is by issue identity, not exit code.
- **Changes since revision 2:** The re-check confirmed the two blockers resolved and raised three major and two minor findings, all applied here.
  - Which assertions need repair is decided by a support inventory in T1, not by gate output. The gates stay as verification.
  - T7 names the generator's apply command and the paths it may change; anything else it changes is reviewed, not committed by default.
  - T2 to T6 now depend on T0 as well as T1.
- **What this slice is:** Removal of text that breaks the authoring standard and is a known confound in the evals. It is not a measurement. It does not show how much the anchors inflated pass rates, that model behavior is unchanged, or that later eval comparisons are clean.
- **Recommendation:** Proceed in two prerequisites, five category groups with one owner each, and one integration task.
- **Impact if wrong:** A skill loses an obligation that was only written in its anchor list, or a repaired assertion grades something different from before. The controls are the inventory, an offline scorer check on every repaired assertion, and a reviewer who is not the slice owner.
- **Evidence and limitations:** File facts are `confirmed` in References, and the counts were re-derived by the independent reviewer. No model was run. No repository gate has been executed, because dependencies are not installed.
- **Decision recorded:** The requesting maintainer approved revision 3, Amendment 1, and the bounded generated-output default by replying "ok" to the approval request. No third independent check was requested; revision 3 remains independently unverified.
- **Authority:** Proceed to `implementation-readiness`; no implementation edits, model spend, release or publication authorized.
- **Independently ready slices:** T0 and T1. T2 to T6 depend on both; T7 depends on T2 to T6.

## Outcome And Guardrails

- **Outcome:** No SKILL.md under `skills/` keeps a "Canonical response anchors" or "Remediation anchors" section, and no eval assertion is left without grounding because of the removal.
- **Not claimed:** That no skill contains scorer-fitting text. The inline sentence at `skills/common/common-operator-profile/SKILL.md:45` and similar wording outside those sections stay until a later slice.
- **Guardrails:**
  - Every obligation a skill states today is still stated after the change.
  - "Core Rule Anchors" sections are byte-identical.
  - Existing `pressure_scenarios`, `rationalizations` and `red_flags` are byte-identical.
  - Frontmatter, triggers and reference files are untouched.
  - No eval case, prompt or `expected_output` is added, removed or changed.
  - Repository gates report no new issue against the T0 baseline.

## Scope And Non-Goals

- **Scope fence:**
  - Sections headed "Canonical response anchors" or "Remediation anchors" in 122 `skills/**/SKILL.md` files.
  - In the 120 matching `evals/evals.json` files, only positive assertions (`contains`, `contains_any`, `regex`) that the T1 support inventory marks `repair`.
  - Files the repository generator rewrites as a consequence. Expected: `skills/metadata.json`, `README.md`, `cli/README.md`, generated indices, the installed copies under `.agents/skills`, `.claude/skills`, `.codex/skills`, `.github/skills`, `.skills-lock.json`, and a run log under `artifacts/generation-logs/`. The generator can also touch bridge and router files, capability documentation, and workflow and specialist exports; a change there is unexpected for a body-only edit and is reviewed before it is kept.
  - Evidence under `artifacts/skill-model-collaboration/`.
- **Non-goals:**
  - "Core Rule Anchors" sections.
  - Any other wording change, including the brief's finding F13 and its slices 2 to 6.
  - Rewriting assertions that stay grounded. They remain word-match checks and are listed in the T7 report as not reviewed.
  - Creating eval files for `common-llm-security` or `common-agent-guardrails`, which have none.
  - Hand-editing any generated file or installed copy.
  - Version bumps, `CHANGELOG.md`, release, publication. The reviewer found no repository rule requiring them for an unreleased source change.
  - New committed scripts or audit rules.
  - Any model run, including the sample re-score.

## Requirements And Acceptance Criteria

| Req ID | Requirement | Owner | Priority | Status |
| --- | --- | --- | --- | --- |
| REQ-001 | No in-scope SKILL.md keeps a padding section | Requesting maintainer | P0 | proposed |
| REQ-002 | Every obligation stated only in a padding section survives as a rule in the same skill | Requesting maintainer | P0 | proposed |
| REQ-003 | No assertion is left ungrounded by the removal, and a repaired assertion keeps its polarity and intent | Requesting maintainer | P0 | proposed |
| REQ-004 | Protected content is unchanged: Core Rule Anchors sections and existing pressure material | Requesting maintainer | P0 | proposed |
| REQ-005 | Repository gates and generated outputs are consistent with the edited source | Requesting maintainer | P1 | proposed |

All requirements trace to the brief's slice 1. The brief is in the Direction lane and has no `BRD-OBJ-*` IDs.

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | The edited `skills/` tree | Searching SKILL.md files for the two headings and for the lead-in "preserve the following domain terminology" | Zero matches | Slice owner | Static search |
| AC-002 | REQ-004 | The 13 skills with a "Core Rule Anchors" section, 7 of which also have a padding section | Extracting that section from the base commit and from the edited tree | The two extracts are byte-identical for all 13 | Integration owner | Section diff |
| AC-003 | REQ-002 | A T1 inventory row with `disposition: relocate` | The slice is complete | The obligation, with its condition, appears as a bullet in an existing rules section of that skill, and the slice's disposition file records the line | Slice owner; checked by integration owner | Inventory cross-check |
| AC-004 | REQ-002 | A T1 inventory row with `disposition: already_stated` | Reading the cited location | The cited line states the same obligation and condition; a row marked `ambiguous` has a recorded decision by the integration owner | Integration owner | Inventory review |
| AC-005 | REQ-003 | A positive assertion, or one `contains_any` alternative, marked `repair` in the T1 support inventory | The slice is complete | Its type stays positive and its case, prompt and `expected_output` are unchanged. The disposition file records the scorer semantics version, two answers that should pass (the expected answer and a valid paraphrase) and one that should fail (contradictory or keyword-stuffed), all run through `scripts/evals/scorer.ts` with the expected results | Slice owner; checked by integration owner | Offline scorer check |
| AC-006 | REQ-003 | Every `not_contains` assertion in the 120 eval files | Diffing against the base commit | No change | Integration owner | Git diff |
| AC-007 | REQ-004 | `common-learning-log` and `common-session-retrospective` eval files | Diffing `pressure_scenarios`, `rationalizations` and `red_flags` against the base commit | No change; no eval file exists or is created for `common-llm-security` | Slice owner (T2) | Git diff |
| AC-008 | REQ-005 | The integrated tree after the generator has run | Running the T0 gate list | Every issue reported is also in the T0 baseline, compared by skill and issue identity; each edited skill still has at least 3 evals with at least 2 assertions, counted directly | Integration owner | Repository gates |
| AC-009 | REQ-005 | The integrated tree after `pnpm generate-indices` | Running `node --import tsx scripts/generation/index.ts --check` | Exit 0, and every path the generator changed is either in the expected list in the scope fence or has a recorded review decision | Integration owner | Repository gates |
| AC-010 | REQ-001 | The integrated tree | Diffing against the base commit | Changes are confined to the scope fence | Integration owner | Git diff |

## Open Consequential Decisions

| Decision | Owner | Affected slice | Required input |
| --- | --- | --- | --- |
| Generated outputs in the change set. Default: run `pnpm generate-indices` and commit the expected outputs listed in the scope fence, including installed copies; unexpected outputs are reviewed first. Alternative: source-only change, with the pre-commit generation check knowingly failing and publication held | Requesting maintainer | T7, AC-009, AC-010 | Approval of this plan accepts the default |
| Authorize a bounded sample re-score (sample size, model, cap) | Requesting maintainer | Deferred slice D1 | Explicit spend approval; not needed for T0 to T7 |
| Execution approach for T2 to T6 (subagent-driven or inline) | Requesting maintainer | T2 to T6 | Asked at the execution gate, after readiness |

## Implementation Plan, Task Slices And Verification Plan

Sizes are t-shirt estimates with confidence; none is a commitment.

Gate list used by T0 and T7, run one at a time by the integration owner because two of them write shared report files: `pnpm evals:audit`, `pnpm evals:preflight`, `pnpm test:evals`, `pnpm check-alignment`, `pnpm audit:skills`, `pnpm validate`, `pnpm test:benchmark`, and `node --import tsx scripts/generation/index.ts --check`. `test:benchmark` exercises the benchmark tooling; it does not re-measure the catalog.

| ID | Type | What it delivers | Paths | Depends on | Trace | Verification | SNC / model hint | Size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T0 | prerequisite | Installed dependencies and a saved baseline of the gate list | `node_modules` (frozen lockfile); `artifacts/skill-model-collaboration/baseline/` | none | REQ-005 | `pnpm install --frozen-lockfile` exits 0; each gate's output, exit code and report file saved | S=0 N=0 C=0, low / fast | S, high |
| T1 | research | Inventory that fixes preservation intent and repair decisions before anyone edits | `artifacts/skill-model-collaboration/anchor-inventory.json`, frozen once accepted | none | REQ-002, REQ-003 | See "T1 inventory contract" below; coverage reconciles; reviewed by the integration owner, and every `ambiguous` row resolved, before T2 to T6 start | S=1 N=1 C=1, medium / standard | M, medium |
| T2 | feature | Padding-free `common` and `product-management` skills | 20 skills; disposition file `dispositions/T2.json` | T0, T1 | AC-001, 003, 005, 007 | Static search clean for these paths; every inventory row for these skills has a disposition | S=1 N=1 C=2, medium / standard | M, medium |
| T3 | feature | Same for web stacks | 35 skills under `angular`, `react`, `nextjs`, `typescript`, `javascript`, `nestjs`; `dispositions/T3.json` | T0, T1 | AC-001, 003, 005 | As T2 without AC-007 | S=1 N=1 C=1, medium / fast | L, medium |
| T4 | feature | Same for Flutter and JVM mobile | 23 skills under `flutter`, `dart`, `android`, `kotlin`, `java`; `dispositions/T4.json` | T0, T1 | AC-001, 003, 005 | As T3 | S=1 N=1 C=1, medium / fast | M, medium |
| T5 | feature | Same for Apple and React Native | 22 skills under `ios`, `swift`, `react-native`; `dispositions/T5.json` | T0, T1 | AC-001, 003, 005 | As T3 | S=1 N=1 C=1, medium / fast | M, medium |
| T6 | feature | Same for backend and QE | 22 skills under `laravel`, `php`, `python`, `golang`, `database`, `quality-engineering`; `dispositions/T6.json` | T0, T1 | AC-001, 003, 005 | As T3 | S=1 N=1 C=1, medium / fast | M, medium |
| T7 | feature | Integrated tree, in this order: dispositions merged and reviewed; `pnpm generate-indices` applied; changed paths reviewed against the expected list; gates compared; report written | Generated files; `artifacts/skill-model-collaboration/slice-1-report.md` | T2 to T6 | AC-002, 004, 006, 008, 009, 010 | Gate list re-run and compared with T0; section diff; scope diff; report lists bytes removed, assertions repaired, and assertions left as unreviewed word matches | S=1 N=0 C=1, low / standard | M, medium |
| D1 | deferred, not authorized | With-skill versus snapshot score on a sample under one protocol | none until approved | T7 and explicit spend approval | Brief slice 1, Amendment 1 | Not planned here | not scored | unknown |

**T1 inventory contract.** The inventory has two parts and needs no installed dependencies.

*Part A, anchor entries.* Every entry in every padding section is accounted for: a bare term gets one `drop` row, and a line that bundles several instructions is split into one row per obligation. Each row records:

- skill, line number, the anchor text, and for an obligation its condition (for example "register dependencies before building the widget");
- `kind`: `vocabulary` (a term with no instruction) or `obligation`;
- `disposition`: `drop` (vocabulary only), `already_stated` with the supporting line, `relocate` with the proposed section, or `ambiguous` with the question for the integration owner;
- a one-line reason.

A term appearing elsewhere in the file is not enough for `already_stated`; the cited line must carry the same obligation and condition. The inventory records each section's start and end line, and the rows for a skill must cover every entry between them.

*Part B, assertion support.* For every positive assertion in the 120 eval files, and for every alternative inside a `contains_any`, the inventory records the case id, type, full value, and where the value is supported before removal: in the padding section, in the skill body outside it, in the prompt, in `expected_output`. Each row then gets one disposition:

- `unaffected`: not supported by the padding section, or also supported elsewhere in the skill body;
- `task_contract`: loses its skill-body support but is still supported by the prompt or `expected_output`; left unchanged;
- `repair`: supported only by the padding section;
- `deferred`: a case the integration owner decides to leave, with the reason.

This is computed from the files, independent of any gate's thresholds. `check-alignment` reports only aggregate percentages and prints nothing for a skill at or above 90%, and `evals:preflight` never reads the skill body, so neither can serve as the list of what to repair.

**Notes for slice owners.**

- T2 to T6 edit disjoint category folders and may run in parallel once T0 is complete and T1 is accepted.
- The inventory is read-only during T2 to T6. Each slice writes only its own disposition file; T7 merges them.
- Slices do not run `evals:audit` or `evals:preflight`, which write shared report files. `pnpm check-alignment` has no scope option and always scans the whole tree; a slice may run it read-only and read off its own skills, but the repair list comes from the inventory.
- Delegated to the builder: wording of a relocated bullet, and the phrasing of a repaired assertion within AC-005.
- Not delegated: changing a disposition, dropping or editing an eval case, touching `not_contains` assertions, or editing outside the slice's folders.
- Throwaway scripts may be used for the inventory and the offline scorer check. They are not committed.

## Status And Receipt

- `feature_status`: `requirements_ready`. Revision 3 approved by the requesting maintainer on 2026-11-11 for readiness assessment; execution approach remains unselected.
- Run record: not written. No run id was issued by the host, and none is invented.

## Independent Check

Run on 2026-11-11 by a separate read-only session on the "Personal · Analysis & Review" profile. It re-derived the counts from the repository and read the eval tooling. Verdict on revision 1: not ready. Verdict on this revision: see the end of this section.

| # | Severity | Finding | Resolution in revision 2 |
| --- | --- | --- | --- |
| 1 | blocker | AC-001 and AC-002 could not both pass: 7 skills hold both section types | AC-002 protects the section, not the file. Overlap confirmed by my own search |
| 2 | blocker | The rewrite rule could turn a `not_contains` into a positive match, for example `not_contains: "SDK"` in `common-store-changelog` | `not_contains` assertions are frozen (AC-006); repairs keep polarity (AC-005) |
| 3 | major | "Two phrasings" is not evidence of a good assertion; preflight accepts one grounded alternative and skips `regex` | Wholesale rewriting removed. Repairs are limited to newly ungrounded assertions and each carries a pass example and a fail example run through the real scorer |
| 4 | major | The pre-commit hook checks generated outputs, and the generator writes installed copies; revision 1 excluded both | Generator output is in scope (AC-009), pending the maintainer's decision above |
| 5 | major | Gates were incomplete: no catalog-wide `check-alignment`, no generation check; audit does not fail on findings; minimum eval counts are not enforced by the audit | Gate list extended; comparison by issue identity; counts checked directly (AC-008) |
| 6 | major | `sole_source` by term presence was underspecified | Inventory is per obligation with four dispositions and an `ambiguous` route (AC-003, AC-004) |
| 7 | major | The brief overstated anchor-to-assertion matching and what slice 1 proves | Brief amended (Amendment 1); Decision Brief above states what is not shown |
| 8 | minor | Shared inventory and shared report files under parallel work; `common-llm-security` has no eval file | Per-slice disposition files; report-writing gates run only by the integration owner; AC-007 names the two eval files that exist |

The reviewer could not run the gates, the generator or any model, for the same reasons given above. It measured 28,733 bytes of padding sections against the brief's 30,831; the brief's figure used a looser boundary and is corrected in Amendment 1.

**Re-check of revision 2: not ready.** Findings 1, 2, 5, 6, 7 and 8 above were confirmed resolved; 3 and 4 partly. New findings and their resolution in revision 3:

| # | Severity | Finding | Resolution in revision 3 |
| --- | --- | --- | --- |
| R1 | major | "Newly flagged by the gates" misses padding-dependent assertions: preflight never reads the skill body, alignment prints nothing at or above 90%, a `contains_any` needs only one supported alternative, and `regex` is accepted if it matches anywhere | Repair selection moved to the T1 support inventory, per assertion and per alternative |
| R2 | major | T7 named only the `--check` command, and the generator touches more paths than listed | Apply command named; expected paths listed; other changes reviewed (scope fence, AC-009) |
| R3 | major | T2 to T6 need installed dependencies for the scorer check but depended only on T1 | T2 to T6 depend on T0 and T1 |
| R4 | minor | `check-alignment` has no scope option | Slice note corrected |
| R5 | minor | The inventory had no completeness check, and `ambiguous` rows had no deadline | Section boundaries and coverage recorded; `ambiguous` resolved before edits start |

Also applied from the re-check: the scorer semantics version and a valid paraphrase are recorded for each repair (AC-005). Revision 3 has not been sent back for a third check.

## References

- Approved brief and Amendment 1: `docs/brd/brd-skill-model-collaboration.md`.
- confirmed, re-derived by the reviewer: 354 SKILL.md files; 122 with a padding heading (119 "Canonical response anchors", 14 "Remediation anchors"); 120 of those have `evals/evals.json`; the two without are `common-llm-security` and `common-agent-guardrails`; 3 are `guardrail: true` (`common-learning-log`, `common-llm-security`, `common-session-retrospective`). Group totals 20, 35, 23, 22, 22.
- confirmed: the 7 skills with both section types are the `*-testing` skills under `angular`, `flutter`, `laravel`, `php`, `react`, `react-native`, `swift`.
- confirmed(.husky/pre-commit): the hook runs `scripts/generation/index.ts --check` and `pnpm validate`.
- confirmed(scripts/generate-indices.ts:420-449): the generator collects local source skills for configured categories and writes them to the agent folders.
- confirmed(skills/common/common-store-changelog/evals/evals.json:54-56): a `not_contains` assertion that overlaps an anchor line.
- confirmed(package.json:94): `check-alignment` exists as a separate script and is not part of `test:evals`.
- Reported by the reviewer and not re-read by me: `scripts/evals/quality.ts:275-282,329-331,720-739`; `scripts/evals/scorer.ts:183-198`; `scripts/calculate-tokens.ts`; `CONTRIBUTING.md:186-199`.
- unknown: how many obligations are stated only in a padding section, how many assertions become ungrounded, and the current state of the gates. T0, T1 and the slices establish these.

## Next Workflow

- `implementation-readiness`. Plan approval is recorded; implementation and spend remain unauthorized.
