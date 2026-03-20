---
name: common-feedback-reporter
description: "Pre-write skill violation audit. Checks planned code against loaded skill anti-patterns before any file write. Use when writing Flutter/Dart code, editing SKILL.md files, or generating any code where project skills are active. Load as composite alongside other skills. (triggers: skill violation, pre-write audit, audit violations, SKILL.md, **/*.dart, **/*.ts, **/*.tsx)"
---

# Feedback Reporter

## **Priority: P0 - Auto-detect skill violations before file writes**

## 🚨 Checkpoint: Before File Writes

**Quick check before `write_to_file`, `replace_file_content`, `multi_replace_file_content`:**

1. **Check** - Any skills loaded for this file extension?
   - NO → ✅ Skip, proceed safely
   - YES → Continue to step 2
2. **Audit** - Does planned code violate loaded skill rules?
   - NO → ✅ Proceed
   - YES → Run feedback command, then fix

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
Skill: [skill-id]
Rule: [exact rule text from SKILL.md]
Violation: [what the planned code does]
Fix: [corrected approach]
```

Then apply the fix immediately — do not wait for user confirmation.

## Pre-Completion Check

Before `notify_user` or task completion:

**Did I write code?** YES → **Did I audit skills?** NO → Audit now

## Anti-Patterns

- **No "I'll check later"**: Check before writing, not after
- **No "minor change skip"**: Every write needs check
- **No "user waiting skip"**: 10-second check > pattern violation
