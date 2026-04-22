---
name: common-session-retrospective
description: Analyze conversation corrections to detect skill gaps and auto-improve the skills library. Use after any session with user corrections, rework, or retrospective requests. After finding correction loops, also load +common/common-learning-log to persist mistake entries to AGENTS_LEARNING.md.
metadata:
  triggers:
    files:
    - '**/*.spec.ts'
    - '**/*.test.ts'
    - 'SKILL.md'
    - 'AGENTS.md'
    - '+common/common-learning-log'
    keywords:
    - retrospective
    - self-learning
    - improve skills
    - session review
    - correction
    - rework
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
3. **Trigger Miss Check** — For every task in session, ask: _" relevant skill available but not loaded?"_
 - If yes: record skill ID, indirect phrase used, and fix (add keyword alias to triggers)
4. **Propose** — One fix per root cause: update skill, update reference, new skill, or new workflow
5. **Implement** — Apply to all agent dirs. Keep SKILL.md concise; move large tables to `references/`. Update `AGENTS.md`
6. **Log to AGENTS_LEARNING.md** — For each correction loop found, append one entry using `common/common-learning-log` protocol (Signal: `Session retrospective`)
7. **Report** — Output correction count, skills changed, trigger misses found, estimated rounds saved

## Trigger Miss Output

Emit trigger miss block (schema in [references/methodology.md](references/methodology.md#trigger-miss-schema)) for each miss detected.

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