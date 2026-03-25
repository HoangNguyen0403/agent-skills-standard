---
name: common-skill-creator
description: 'Standards for creating, testing, and optimizing Agent Skills for any AI Agent (Claude, Cursor, Windsurf, Copilot). Use when: writing SKILL.md, auditing a skill, improving trigger accuracy, checking size limits, structuring references/, writing anti-patterns, starting a new skill from scratch, or reviewing skill quality.'
---

# Agent Skill Creator Standard

## **Priority: P0 — Apply to ALL skills**

Maximize info/token ratio. Every line in SKILL.md competes for context window space.

## Three-Level Loading System

- **Level 1** Frontmatter (always in context): name + description, ~100 words max
- **Level 2** SKILL.md body (triggered): core rules, ≤100 lines
- **Level 3** references/ (on demand): detailed examples, schemas, deep-dives

## Workflow (New or Existing Skill)

**New skill:**

1. **Capture intent** — what does it do, when does it trigger, expected output format?
2. **Write SKILL.md** — draft using [TEMPLATE.md](references/TEMPLATE.md)
3. **Test** — spawn parallel subagents: one with-skill, one without-skill (baseline)
4. **Evaluate** — grade assertions, review benchmark (pass rate, tokens, time)
5. **Iterate** — rewrite based on feedback, rerun into next iteration dir, repeat
6. **Optimize description** — run trigger eval queries, target ≥80% accuracy

**Existing skill:**

1. **Audit** — run Quality Checklist below; identify violations
2. **Snapshot** — `cp -r <skill-dir> <workspace>/skill-snapshot/` before any edits
3. **Improve SKILL.md** — fix violations, compress, move oversized content to `references/`
4. **Test** — spawn parallel subagents: one with-new-skill, one with-snapshot (baseline)
5. **Evaluate & iterate** — same as steps 4–5 above
6. **Optimize description** — re-run trigger eval if description changed

See [Eval Workflow](references/eval-workflow.md) for full testing + iteration details.

## Writing Rules

- **Imperative compression**: verbs first, drop articles. Bullets > paragraphs.
- **Structure order**: Priority → Core Rules → Anti-Patterns → References
- **Descriptions**: push trigger contexts into frontmatter; list edge cases; be "pushy"
- **Anti-pattern format**: `**No X**: Do Y.` ≤15 words total

## Anti-Patterns

- **No long code blocks**: >10 lines → extract to `references/`
- **No redundancy**: don't repeat frontmatter content in body
- **No YAML bloat**: embed all trigger context in `description` — no separate `keywords:` arrays. Two styles:
  - File/keyword triggers: `description: "... (triggers: SKILL.md, *.ext)"`
  - Conversational triggers: `description: "... Use when the user says 'run X' or 'I want to Y'"`
- **No packaging**: skip Python packaging steps; distribute as folder directly

## Quality Checklist

- [ ] SKILL.md ≤100 lines
- [ ] No inline code block >10 lines
- [ ] Description lists specific triggers, is "pushy"
- [ ] All references linked with load conditions
- [ ] Eval cases written in `evals/evals.json`
- [ ] Trigger rate ≥80% on should-trigger queries

## References

- [Skill Template](references/TEMPLATE.md) — start here for new skills
- [Anti-Patterns Detail](references/anti-patterns.md) — format guide + verbose examples
- [Size & Limits](references/size-limits.md) — exact line budgets
- [Resource Organization](references/resource-organization.md) — scripts/, references/, assets/ rules
- [Testing & Trigger Rate](references/testing.md) — evals, should-trigger queries, optimization loop
- [Eval Workflow](references/eval-workflow.md) — test execution, benchmark, iteration, description optimization
- [Full Lifecycle](references/lifecycle.md) — phases 1–5, validation checklist
