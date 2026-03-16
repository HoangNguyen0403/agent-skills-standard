---
name: common-session-retrospective
description: "Analyze conversation corrections to detect skill gaps and auto-improve the skills library. Use after any session with user corrections, rework, or retrospective requests. (triggers: **/*.spec.ts, **/*.test.ts, SKILL.md, AGENTS.md, retrospective, self-learning, improve skills, session review, correction, rework)"
---

# Session Retrospective

## **Priority: P1 (OPERATIONAL)**

## Structure

```text
common/session-retrospective/
├── SKILL.md              # Protocol (this file)
└── references/
    └── methodology.md    # Signal tables, taxonomy, report template
```

## Protocol

1. **Extract** — Scan for correction signals (loops, rejections, shape mismatches, lint rework)
2. **Classify** — Root cause: Skill Missing | Incomplete | Example Contradicts Rule | Workflow Gap | **Trigger Miss**
3. **Trigger Miss Check** — For every task in the session, ask: _"Was a relevant skill available but not loaded?"_
   - If yes: record skill ID, indirect phrase used, and fix (add keyword alias to triggers)
4. **Propose** — One fix per root cause: update skill, update reference, new skill, or new workflow
5. **Implement** — Apply to all agent dirs. Keep SKILL.md concise; move large tables to `references/`. Update `AGENTS.md`
6. **Report** — Output correction count, skills changed, trigger misses found, estimated rounds saved

## Trigger Miss Output

Emit this block when a trigger miss is detected:

```json
{
  "trigger_miss": {
    "skill": "category/skill-name",
    "indirect_phrase": "the exact user wording that should have matched",
    "root_cause": "keyword_not_in_triggers | glob_not_matched | composite_missing",
    "fix": "add keyword 'X' to skill triggers | add composite '+Y' to foundational_composite_rules"
  }
}
```

## Guidelines

- **Cite specifics**: Reference concrete conversation moment per proposal
- **Extend first**: Search `AGENTS.md` before creating — update existing skills
- **One fix per loop**: One correction → one targeted skill change
- **Sync all agents**: Apply to every agent skill dir listed in `.skillsrc` `agents` field
- **Follow skill-creator**: New skills comply with `common/skill-creator` standards

## Anti-Patterns

- **No Vague Proposals**: Cite exact gap + fix, not "make X better"
- **No Duplicate Skills**: Search AGENTS.md index first
- **No Oversized Patches**: Extract to `references/` per skill-creator standard

## References

Signal tables, root cause taxonomy, report template, real-world example:
[references/methodology.md](references/methodology.md)
