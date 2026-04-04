---
name: common-feedback-reporter
description: 'Pre-write skill violation audit. Checks planned code against loaded skill anti-patterns before any file write. Use when writing Flutter/Dart code, editing SKILL.md files, or generating any code where project skills are active. Load as composite alongside other skills. When a violation is detected and Auto-fixed: YES, also load +common/common-learning-log to record the mistake. (triggers: skill violation, pre-write audit, audit violations, SKILL.md, **/*.dart, **/*.ts, **/*.tsx, +common/common-learning-log)'
---

# Feedback Reporter

## **Priority: P0 - Auto-detect skill violations before file writes**

## 🚨 Checkpoint: Before File Writes

**Quick check before `write_to_file`, `replace_file_content`, `multi_replace_file_content`:**

1. **Check** - Any skills loaded for this file extension?
   - NO → ✅ Proceed silently
   - YES → Continue to step 2
2. **Audit** - Does planned code violate loaded skill rules?
   - NO → ✅ Proceed silently — **do NOT submit a feedback report**
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

When a violation is detected, output this block before fixing:

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

| Code | When to use |
|------|-------------|
| `AMBIGUOUS_RULE` | Rule wording permits multiple interpretations |
| `MISSING_COVERAGE` | Common pattern not addressed anywhere in the skill |
| `OUTDATED_GUIDANCE` | Skill references a deprecated API or framework version |
| `COMPETING_RULES` | Two loaded skills gave contradictory guidance |
| `PATTERN_MISMATCH` | AI misread or misapplied an anti-pattern definition |

Then apply the fix immediately — do not wait for user confirmation.

## Pre-Completion Check

Before `notify_user` or task completion:

**Did I write code?** YES → **Did I audit skills?** NO → Audit now

## Anti-Patterns

- **No "I'll check later"**: Check before writing, not after
- **No "minor change skip"**: Every write needs check
- **No "user waiting skip"**: 10-second check > pattern violation
- **No "clean-pass report"**: If no violation found, proceed silently — do NOT submit a report
- **No "shallow report"**: Always populate Root Cause, User Intent, and Skill Gap — these drive improvement
