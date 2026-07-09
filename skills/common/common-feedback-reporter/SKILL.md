---
name: common-feedback-reporter
description: "Pre-write audit for skill violations: checks planned code against loaded skill anti-patterns before any file write. Use when writing Flutter/Dart/TS code or editing SKILL.md files with active project skills. Load as composite; on auto-fixed violation, also load +common/common-learning-log."
metadata:
  triggers:
    files:
      - "SKILL.md"
      - "**/*.dart"
      - "**/*.ts"
      - "**/*.tsx"
      - "+common/common-learning-log"
    keywords:
      - skill violation
      - pre-write audit
      - audit violations
---

# Feedback Reporter

## **Priority: P0 (CRITICAL)** — Auto-detect skill violations before file writes.

## 🚨 Checkpoint: Before File Writes

**Quick check before `write_to_file`, `replace_file_content`, `multi_replace_file_content`:**

1. **Check** - Any skills loaded for this file extension?
- NO → ✅ Proceed silently
- YES → Continue to step 2

2. **Audit** - planned code violate loaded skill rules?
- NO → ✅ Proceed silently — ** NOT submit feedback report**
- YES → Output violation block below, then fix immediately

## Detection Flow

```
Before file write?
├─ Check file extension → Identify loaded skills
├─ Review skill anti-patterns/rules
├─ Code matches anti-pattern?
│  ├─ YES → 🚨 VIOLATION → feedback command
│  └─ NO → ✅ Proceed
└─ No skills loaded → ✅ Proceed
```

## Examples (Quick Reference)

**Flutter**: `color: Colors.blue` → Rule: No hardcoded colors → Report + use theme

**React**: `class MyComponent extends...` → Rule: Use functions → Report + convert

**SKILL.md**: 105 lines → Rule: ≤100 lines max → Report + extract to references/

[More examples →](references/violation-examples.md)

## Violation Report Format

When violation detected, output this block before fixing:

```
🚨 SKILL VIOLATION DETECTED
Skill:        [skill-id]
File:         [relative/path/to/file.ext]:[line-range]
Rule:         [exact rule text from SKILL.md]
Violation:    [what planned code does — up to 5-line offending snippet]
Fix:          [corrected approach — up to 5-line corrected snippet]
Auto-fixed:   YES / NO
Root Cause:   [AMBIGUOUS_RULE | MISSING_COVERAGE | OUTDATED_GUIDANCE | COMPETING_RULES | PATTERN_MISMATCH]
User Intent:  [1 sentence: what the user was trying to achieve]
Skill Gap:    [1–2 sentences: what change to the SKILL.md would prevent this next time]
Co-skills:    [other active skill IDs, comma-separated, or 'none']
```

### Root Cause Guide

| Code                | When to use                                          |
| ------------------- | ---------------------------------------------------- |
| `AMBIGUOUS_RULE`    | Rule wording permits multiple interpretations        |
| `MISSING_COVERAGE`  | Common pattern not addressed anywhere in skill       |
| `OUTDATED_GUIDANCE` | Skill references deprecated API or framework version |
| `COMPETING_RULES`   | Two loaded skills gave contradictory guidance        |
| `PATTERN_MISMATCH`  | AI misread or misapplied anti-pattern definition     |

Then apply fix immediately — not wait for user confirmation.

## Pre-Completion Check

Before `notify_user` or task completion:

** I write code?** YES → ** I audit skills?** NO → Audit now

## Anti-Patterns

- **No "I'll check later"**: Check before writing, not after
- **No "minor change skip"**: Every write needs check
- **No "user waiting skip"**: 10-second check > pattern violation
- **No "clean-pass report"**: If no violation found, proceed silently — NOT submit report
- **No "shallow report"**: Always populate Root Cause, User Intent, and Skill Gap — these drive improvement
