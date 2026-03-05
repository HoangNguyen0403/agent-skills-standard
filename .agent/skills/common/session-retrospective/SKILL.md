---
name: Session Retrospective
description: Analyze conversation corrections to detect skill gaps and auto-improve the skills library. Use after any session with user corrections, rework, or retrospective requests.
metadata:
  labels: [meta, self-learning, feedback, quality, continuous-improvement]
  triggers:
    files: ['**/*.spec.ts', '**/*.test.ts', 'SKILL.md', 'AGENTS.md']
    keywords:
      [
        retrospective,
        self-learning,
        improve skills,
        session review,
        correction,
        rework,
      ]
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
2. **Classify** — Root cause: Skill Missing | Incomplete | Example Contradicts Rule | Workflow Gap
3. **Propose** — One fix per root cause: update skill, update reference, new skill, or new workflow
4. **Implement** — Apply to all agent dirs. Keep SKILL.md ≤70 lines. Update `AGENTS.md`
5. **Report** — Output correction count, skills changed, estimated rounds saved

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
