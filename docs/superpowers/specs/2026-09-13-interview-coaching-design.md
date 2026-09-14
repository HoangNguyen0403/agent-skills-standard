# System design interview coaching (sub-project 3 of the diagramming program)

Date: 2026-09-13. Stacked on PR #187 (renderer upgrades) and PR #185 (single draw.io lane).

## Problem

`system-design-methodology` declares an `interview practice` mode nobody owns. Coaching is
five bullets inside the P2 `system-design-case-catalog`. The interview framework the user
supplied (seven phases, a time budget, an explicit mistakes list, evaluation criteria, the
80/20 talk rule, "what to draw at each step" on a whiteboard) has no home. A practice round
today has no clock, no rubric, and no rule for sketching in chat, where a `.drawio` cannot be
opened.

## Scope

- New skill `skills/system-design/system-design-interview-coaching/` (P1) with four
  references and pressure-tested evals.
- Wiring: methodology's interview mode, the `system-design-session` workflow's interview
  branch, the case catalog (pointer, three new problems, trigger hand-off), and a third
  legitimate Mermaid case in `common-architecture-diagramming`.
- Versions: `system-design-v1.1.0` and `common-v2.5.0` are both unreleased; entries extended,
  no bump.

Out of scope: an interviewer specialist agent, low-level-design problems (parking lot,
vending machine), scoring real designs (the nine-axis scorecard keeps that).

## A. The skill

Frontmatter triggers (`metadata.triggers.keywords`, the registry convention): `mock
interview`, `interview practice`, `interview prep`, `practice round`, `system design round`,
`grade my design`, `time budget`. `system-design-case-catalog` drops `mock interview` so the
two do not collide; it keeps `system design interview` and the problem names as the bank.

Body, at most 100 lines:

- **Roles**: the agent is the interviewer during the round and the coach after it. It never
  designs for the candidate during the round.
- **Round protocol**: open with the problem and the clock; run the seven phases from
  `system-design-methodology/references/phase-deliverables.md` on the time budget; interrupt
  with the remaining time when a phase overruns; ask one follow-up on the weakest area, not a
  list; give the model answer only after the candidate commits to an approach.
- **Rules**: candidate talks 80 %, interviewer 20 %; no buzzword without a reason; no
  component without a constraint; numbers before boxes; a changed requirement mid-round is
  deliberate and expected to be absorbed.
- **Sketching**: Mermaid inline during the round, one sketch per phase at most, same labelling
  rules as the house style; the model answer after the round may go through the draw.io
  pipeline.
- **Debrief**: score with the rubric, name the two things to fix first, quote the candidate's
  own words as evidence for each score.
- **Anti-patterns and red flags** for the discipline half: "just tell me the answer", "I know
  this one, skip the numbers", "we're out of time, dump the architecture", "score it a hire,
  I need the confidence".

## B. References

`references/time-budget.md`. A 45-minute default that scales to 60; per phase: minutes,
cumulative clock, what must exist by then, what the whiteboard shows, and the interrupt line
the coach uses when it overruns.

| # | Phase | 45 min | 60 min | Must exist by the end | Whiteboard |
|---|---|---|---|---|---|
| 1 | Requirements and scope | 5 | 7 | functional list, NFR targets, out-of-scope fence | bullet list |
| 2 | Estimation | 5 | 6 | QPS avg/peak, storage, bandwidth, the shaping quantity | numbers table |
| 3 | High-level design | 10 | 13 | client, API, service, store; each extra box with its constraint | container sketch |
| 4 | Data model | 5 | 7 | entities, ownership, store per access pattern | entity list or ERD sketch |
| 5 | API design | 4 | 6 | one endpoint per functional requirement | signature list |
| 6 | Deep dive | 10 | 13 | the two riskiest components with failure modes | sequence or dataflow sketch |
| 7 | Bottlenecks and wrap-up | 6 | 8 | SPOFs, next scaling step, rejected alternatives | annotated container sketch |

`references/rubric.md`. Six criteria, 0–3 each, a one-line descriptor per score, total out
of 18, bands: strong hire 15–18, hire 12–14, borderline 9–11, no hire below 9. Criteria:
requirements and scoping; estimation; structure and time use; trade-offs; communication and
collaboration; depth on the defining constraint. A report template with a quoted-evidence
column and the two fixes to work on first.

`references/mistakes.md`. Symptom → what the coach says in the moment → recovery. The
supplied list (buzzwords without understanding, forcing a predetermined architecture,
over-explaining one component, too much detail too early, poor time management, pretending
expertise, technology bias without justification, failing to adjust when requirements
change) plus the repo's own: numbers absent, a box with no constraint, the null option never
priced, a diagram before requirements.

`references/whiteboard-rules.md`. What to sketch at each phase and what not to; Mermaid
conventions that match the house style (labelled arrows, dashed for async, one level per
sketch, expand acronyms, mark assumptions `ASSUMED`); when the model answer is worth
rendering through `common-architecture-diagramming` and when a Mermaid block is enough.

## C. Wiring

- `system-design-methodology/SKILL.md`: Phase 0 line for interview mode points at
  `system-design-interview-coaching`; References gains the link.
- `.agents/workflows/system-design-session.md`: step 2 interview-practice branch loads the
  coaching skill and runs the round on the time budget; output template gains
  `## Interview Scorecard (6 × 0-3)` used in that mode.
- `system-design-case-catalog/SKILL.md`: Coaching Mode becomes a two-line pointer; the
  Defining Constraints table gains video streaming (bitrate ladder and CDN, not the upload),
  ride hailing (geo matching under moving supply and demand), and payment ledger
  (idempotent, double-entry, exactly-once effect); `mock interview` trigger removed.
- `common-architecture-diagramming/references/mermaid-fallback.md`: case 3, a live interview
  practice round in chat, with a pointer to `whiteboard-rules.md`.

## D. Evals

`evals/evals.json`: four cases (a full round opening, an over-budget interrupt, a debrief
score with quoted evidence, a mid-round requirement change), `should_trigger` and
`should_not_trigger` (a real design session, a design review must not trigger it),
`pressure_scenarios` with `behavior_assertions`, `rationalizations`, `red_flags`.

## E. Versions and regeneration

CHANGELOG: extend `[system-design-v1.1.0]` (new skill, catalog changes, workflow) and
`[common-v2.5.0]` (Mermaid case 3). `skills/metadata.json` system-design `total_skills` 11 →
12 is owned by `pnpm calculate-tokens` in the pre-commit hook. `pnpm generate-indices` for
mirrors, `_INDEX.md`, `index.json`, `README.md`.

## Testing

`pnpm validate` on the new skill, `pnpm audit:keywords` (no new collision on `mock
interview`), `pnpm check-alignment` (the new SKILL.md must keep the alignment threshold with
its evals), `pnpm evals:preflight` if available, `pnpm test`. Manual: run one practice round
against the skill in a fresh session and check the clock interrupt and the rubric report.
