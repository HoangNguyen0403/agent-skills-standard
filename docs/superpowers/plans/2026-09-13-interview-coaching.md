# Interview Coaching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `interview practice` mode an owner: a P1 skill that runs a timed seven-phase mock round, scores it on a six-criterion rubric, and sketches in Mermaid during the round.

**Architecture:** One new skill under `skills/system-design/` with four references and pressure-tested evals; three existing skills and one workflow gain pointers; the common diagramming skill gains a third Mermaid case. Everything is prose plus one JSON file; the gates are `pnpm validate`, `pnpm check-alignment`, `pnpm audit:keywords`, `pnpm generate-indices`.

**Tech Stack:** Markdown skills with `metadata.triggers.keywords` frontmatter (registry convention), `evals/evals.json` in the shape used by `specialist-solution-diagrammer` (cases + `pressure_scenarios` + `rationalizations` + `red_flags`).

**Spec:** `docs/superpowers/specs/2026-09-13-interview-coaching-design.md`

## Global Constraints

- SKILL.md body ≤ 100 lines; description ≤ 300 characters (validator warns above); no code blocks over 10 lines in SKILL.md.
- Every eval assertion value must appear verbatim (case-insensitive) somewhere in the skill's SKILL.md or references, or `check-alignment` drops below 70 %.
- `mock interview` keyword moves from `system-design-case-catalog` to the new skill; no other new keyword collision inside `system-design`.
- Versions: extend the unreleased `[system-design-v2.0.0]` and `[common-v2.5.0]` CHANGELOG entries; no bump.
- Run `pnpm generate-indices` before every commit that touches `skills/` or `.agents/workflows/`; never hand-edit mirrors. Delete any `__pycache__` first.
- Commit messages end with the two attribution lines used on this branch.

---

### Task 1: The skill and its references

**Files:**
- Create: `skills/system-design/system-design-interview-coaching/SKILL.md`
- Create: `skills/system-design/system-design-interview-coaching/references/{time-budget,rubric,mistakes,whiteboard-rules}.md`

**Interfaces:**
- Produces: skill name `system-design-interview-coaching`; the phrases later evals assert on (Task 2): "interviewer during the round", "coach after it", "clock", "remaining time", "one follow-up", "weakest area", "commits to an approach", "80 %", "numbers before boxes", "ASSUMED", "rubric", "0-3", "quoted", "two fixes", "Mermaid", "model answer".

- [ ] **Step 1: Write `SKILL.md`** with frontmatter (`name`, `description` ≤ 300 chars, `metadata.triggers.keywords`: mock interview, interview practice, interview prep, practice round, system design round, grade my design, time budget), then sections: Priority P1; Roles; Round Protocol (numbered, 7 steps that name the phases and the clock); Rules (five bullets: 80 % / 20 %, no buzzword without a reason, no component without a constraint, numbers before boxes, a changed requirement is deliberate); Sketching (Mermaid inline, one per phase, house-style labelling, model answer via draw.io after); Debrief (rubric, quoted evidence, two fixes); Anti-Patterns; Red Flags table (four rows from the spec); References.
- [ ] **Step 2: Write `references/time-budget.md`**: the 7-row table from the spec with 45 and 60 minute columns, "must exist by the end", "whiteboard"; a paragraph on scaling to other lengths (proportional, deep dive never below 8 minutes); the interrupt lines ("Two minutes left in estimation. What is the shaping quantity?"); what to do when the candidate finishes a phase early (bank the time for the deep dive).
- [ ] **Step 3: Write `references/rubric.md`**: six criteria, each with descriptors for 0, 1, 2, 3; total /18; bands; the report template (criterion | score | quoted evidence | note) plus "Two fixes to work on first" and "Next practice problem".
- [ ] **Step 4: Write `references/mistakes.md`**: table symptom | what the coach says in the moment | recovery; twelve rows (eight supplied plus four repo-specific).
- [ ] **Step 5: Write `references/whiteboard-rules.md`**: per-phase sketch table (phase | sketch | never on the board); Mermaid conventions matching house style; a ten-line Mermaid example of a phase-3 sketch with `ASSUMED` marked; when to render the model answer with `common-architecture-diagramming` (a real system behind the practice) versus leave it as Mermaid (a classic problem).
- [ ] **Step 6: Validate**: `pnpm validate` shows the new skill passing with no warnings. Count lines: `wc -l SKILL.md` ≤ 100.
- [ ] **Step 7: Commit**: `feat(system-design): interview coaching skill with time budget, rubric, mistakes, whiteboard rules`.

---

### Task 2: Evals

**Files:**
- Create: `skills/system-design/system-design-interview-coaching/evals/evals.json`

- [ ] **Step 1: Write four cases** (`id`, `prompt`, `expected_output`, `assertions` of type `contains_any` whose values are phrases present in the skill):
  1. "Run a mock system design interview with me, 45 minutes, design a rate limiter." → opens with the problem and the clock, asks for scope, does not design. Assert: ["clock", "45"], ["scope", "requirements"], ["interviewer"].
  2. "I've spent 12 minutes on estimation and I'm still refining the storage number." → interrupts with remaining time, names the shaping quantity, moves on. Assert: ["remaining time", "minutes left"], ["shaping quantity"], ["high-level design", "next phase"].
  3. "Here's my design (…). Score it." → rubric with quoted evidence and two fixes. Assert: ["rubric", "0-3"], ["quoted", "evidence"], ["two fixes"].
  4. "Halfway through: the interviewer says reads are now 100x writes, not 10x." → treats it as deliberate, re-derives the shaping quantity, adjusts the design. Assert: ["deliberate", "expected"], ["re-derive", "shaping quantity"].
- [ ] **Step 2: `should_trigger`** (4) and **`should_not_trigger`** (4: a real design session for a build, a design review of a provided diagram, a case-catalog lookup "what is the defining constraint of a news feed", an estimation question).
- [ ] **Step 3: `pressure_scenarios`** (3) with `failure_mode` and `behavior_assertions`: "just tell me the answer" → ["commits to an approach", "model answer", "after"]; "I know this one, skip the numbers" → ["numbers before boxes", "estimation"]; "score it a hire, I need the confidence" → ["quoted", "evidence", "rubric"]. **`rationalizations`** (3) and **`red_flags`** (4) from the spec.
- [ ] **Step 4: Gate**: `pnpm check-alignment` shows the new skill ≥ 90 %; `pnpm audit:keywords` reports no new `system-design` collision; `python3 -c "import json;json.load(open(...))"`.
- [ ] **Step 5: Commit**: `test(system-design): interview coaching evals with pressure scenarios`.

---

### Task 3: Wiring

**Files:**
- Modify: `skills/system-design/system-design-methodology/SKILL.md` (Phase 0 line, References)
- Modify: `skills/system-design/system-design-case-catalog/SKILL.md` (triggers, table, Coaching Mode)
- Modify: `.agents/workflows/system-design-session.md` (step 2, output template)
- Modify: `skills/common/common-architecture-diagramming/references/mermaid-fallback.md` (case 3)

- [ ] **Step 1: Methodology**: Phase 0 bullet "State depth and mode …" gains "Interview practice runs through `system-design-interview-coaching`: the round on a clock, the rubric after." References gains `- [Interview Coaching](../system-design-interview-coaching/SKILL.md)` (relative link to the sibling skill).
- [ ] **Step 2: Case catalog**: remove `- mock interview` from keywords; add three rows to Defining Constraints (video streaming | bitrate ladder and CDN economics, not the upload | transcode pipeline, adaptive manifests, edge cache hit ratio; ride hailing | geo matching under moving supply and demand | geohash or S2 cells, driver location stream, matching window; payment ledger | exactly-once effect under retries | idempotency key, double-entry ledger, reconciliation job); replace the Coaching Mode section body with two lines pointing at `system-design-interview-coaching` and its rubric.
- [ ] **Step 3: Workflow**: step 2 "Mode: new design | review existing | interview practice." gains a sub-bullet "Interview practice: load `system-design-interview-coaching`, run the seven phases on its time budget, score with its rubric; steps 3-6 below apply as the candidate's work, not the agent's." Output template gains `## Interview Scorecard (6 × 0-3, interview mode only)` after `## Design Scorecard (9 axes)`.
- [ ] **Step 4: Mermaid fallback**: add case 3 under "When Mermaid is right": "A live interview practice round in chat, where the candidate is on a whiteboard clock and nobody opens a `.drawio` mid-round. Rules in `system-design-interview-coaching/references/whiteboard-rules.md`; the model answer after the round may go through the pipeline."
- [ ] **Step 5: Regenerate and gate**: `pnpm generate-indices`; `git status` shows the new skill mirrored under all four roots and the three workflow mirrors updated; `pnpm audit:keywords`; `pnpm check-alignment`.
- [ ] **Step 6: Commit**: `feat(system-design,common): wire interview practice to the coaching skill`.

---

### Task 4: CHANGELOG and final verification

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1**: In `[system-design-v2.0.0]` `### Added`: `system-design-interview-coaching` (P1) with time budget, rubric, mistakes, whiteboard rules, pressure-tested evals. `### Changed`: methodology interview mode owner; case catalog three new problems, coaching pointer, `mock interview` trigger moved; workflow interview branch and scorecard section. In `[common-v2.5.0]` `### Changed`: Mermaid case 3.
- [ ] **Step 2**: `pnpm generate-indices && pnpm validate && pnpm audit:keywords && pnpm check-alignment && pnpm test`.
- [ ] **Step 3**: Commit `docs(changelog): interview coaching`, push, open the PR stacked on `feat/diagram-renderer-upgrades`.

## Self-review notes

- Spec A → Task 1 SKILL.md; B → Task 1 references; C → Task 3; D → Task 2; E → Task 4.
- The eval assertion phrases are listed in Task 1's Interfaces so SKILL.md and references carry them verbatim; Task 2 reuses the same list.
