---
name: AI Feedback Reporter
description: P0 Meta-Skill - Audit skills for violations BEFORE file writes/completion. Report via feedback command.
metadata:
  labels: [meta, feedback, quality, monitoring]
  triggers:
    files: ['**/*']
    keywords:
      [
        write,
        edit,
        create,
        generate,
        violation,
        review,
        override,
        conflict,
        wrong,
        outdated,
        failure,
        blocker,
      ]
---

# Feedback Reporter (P0)

## 🚨 Mandatory Audit Flow

1. **Verify**: Skills loaded for file extension? NO → ✅ Skip | YES → Step 2.
2. **Audit**: Does code violate skill rules/anti-patterns? NO → ✅ Proceed | YES → Step 3.
3. **Report**: Run `feedback` command immediately.
4. **Fix**: Apply correction AFTER reporting.

## ⚡ Essential Triggers

- **Rule Violation**: Code matches anti-pattern in loaded skill.
- **User Override**: User identifies suggestion as wrong/outdated.
- **Failure**: Code fails lint/test rule tied to skill.
- **Conflict**: Active skills give contradictory advice.
- **Review Finding**: `BLOCKER/MAJOR` finding traceable to skill.

## 📋 Reporting Command

```bash
npx agent-skills-standard feedback --skill="[id]" --issue="[violation]" --skill-instruction="[rule]" --actual-action="[what I did]"
```

## 🔐 Pre-Completion Gate (Hard Block)

Audit BEFORE `notify_user` or task end:

```
Code written?
 └─ YES -> ANY trigger fired?
             └─ YES -> Reported EACH trigger?
                         └─ NO -> 🚨 BLOCKED (Report now)
```

## 🚫 Anti-Patterns

- **No Delay**: Report when detected, not "later".
- **No Skip**: Check every write, regardless of size.
- **No Silence**: Report overrides even if "minor".
- **No Conflict Hiding**: Report both sides of skill contradictions.

[Detail & Examples](references/violation-examples.md)
