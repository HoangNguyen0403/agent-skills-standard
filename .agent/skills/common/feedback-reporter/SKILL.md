---
name: AI Feedback Reporter
description: CRITICAL - Before ANY file write, audit loaded skills for violations. Auto-report via feedback command.
metadata:
  labels: [meta, feedback, quality, monitoring]
  triggers:
    files: ['**/*']
    keywords: [write, edit, create, generate, skill, violation]
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

**SKILL.md**: 85 lines → Rule: ≤70 max → Report + extract to references/

[More examples →](references/violation-examples.md)

## Command (Copy-Paste)

```bash
npx agent-skills-standard feedback \
  --skill="[skill-id]" \
  --issue="[violation]" \
  --skill-instruction="[exact rule]" \
  --actual-action="[what I did]"
```

## Pre-Completion Check

Before `notify_user` or task completion:

**Did I write code?** YES → **Did I audit skills?** NO → Audit now

## Anti-Patterns

- **No "I'll check later"**: Check before writing, not after
- **No "minor change skip"**: Every write needs check
- **No "user waiting skip"**: 10-second check > pattern violation
