# Session Retrospective Methodology

## Trigger Miss Schema

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

Detailed reference for the Session Retrospective skill.

## Correction Signal Detection

| Signal              | How to Detect                                          |
| ------------------- | ------------------------------------------------------ |
| Correction Loop     | User rejected output, same file edited >1 round        |
| Explicit Rejection  | User said "don't do X", "wrong", "that's not right"    |
| Shape Mismatch      | Agent used wrong DTO/entity/config field names         |
| Lint Rework         | Same lint rule violated across multiple files          |
| Anti-Pattern Repeat | Agent repeated pattern (e.g., `as any`) user corrected |

## Root Cause Taxonomy

| Root Cause               | Description                                    |
| ------------------------ | ---------------------------------------------- |
| Skill Missing            | No skill covers this pattern                   |
| Skill Incomplete         | Skill exists but lacks specific rule           |
| Example Contradicts Rule | Reference demonstrates prohibited anti-pattern |
| Workflow Gap             | No systematic process for this task type       |

## Fix Types

Apply **exactly one** per root cause:

1. **Update existing skill** → file path + section + proposed addition
2. **Update reference** → file path + code example to fix or add
3. **New skill** → follow `skill-creator` standard (≤70 lines SKILL.md)
4. **New workflow** → name + trigger + step outline (≤80 lines)

## Implementation Checklist

- [ ] Applied to all agent skill dirs listed in `.skillsrc` `agents` field
- [ ] SKILL.md ≤70 lines
- [ ] `AGENTS.md` index updated if triggers changed
- [ ] No duplicate skills (extended existing instead)

## Report Template

```markdown
## Session Retrospective Report

**Date**: [date] | **Task**: [description]
**Correction Loops Found**: [N]

| #   | Signal | Root Cause | Fix Applied |
| --- | ------ | ---------- | ----------- |
| \_  | \_     | \_         | \_          |

### Skills Updated: [list]

### Skills Created: [list]

### Estimated Rounds Saved: [N]
```

## Real-World Example

Test coverage improvement session — 5 corrections detected:

| #   | Signal                          | Root Cause               | Fix                                                      |
| --- | ------------------------------- | ------------------------ | -------------------------------------------------------- |
| 1   | `as any` in 14 specs (3 rounds) | Example Contradicts Rule | Fixed `patterns.md` examples                             |
| 2   | "don't trick by disable lint"   | Skill Incomplete         | Added strict-TS section to testing skill                 |
| 3   | Wrong DTO fields                | Skill Missing            | Added DTO verification to `strict-typescript-testing.md` |
| 4   | Jest matchers lint (2 rounds)   | Skill Missing            | Added casting patterns reference                         |
| 5   | No coverage process             | Workflow Gap             | Created `improve-coverage.md` workflow                   |

**Estimated Rounds Saved**: ~6 per future similar session
