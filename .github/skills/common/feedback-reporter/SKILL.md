---
name: AI Feedback Reporter
description: Report skill issues when AI detects non-adherence, conflicts, or mistakes.
context_triggers:
  - 'deviated from loaded skill'
  - 'skill pattern not applied'
  - 'test failed after following skill'
  - 'user corrected skill-based code'
  - 'conflicting skills loaded'
  - 'skill guidance ambiguous'
  - 're-implemented existing pattern'
priority: 'P1'
---

# Feedback Reporter

## **Priority: P1 (IMPROVEMENT)**

**Purpose**: Auto-report when you deviate from skill guidance, detect conflicts, or make mistakes.

## Detection & Execution

**Trigger on**: Deviation from loaded skill | Pattern exists but not applied | Test/lint failed | User corrected code | Conflicting skills | Unclear guidance | Re-implemented existing pattern

**Before code changes**: Check loaded skills → Following exactly? → If NO, report.

## Command

```bash
# AI Auto-Report (recommended)
npx agent-skills-standard feedback \
  --skill="react/hooks" \
  --issue="Used useEffect without cleanup" \
  --skill-instruction="Always include cleanup for event listeners" \
  --actual-action="Created useEffect without return" \
  --decision-reason="Missed cleanup requirement"
```

## Fields

| Field                 | Required | Auto? | Description       | Example                            |
| --------------------- | -------- | ----- | ----------------- | ---------------------------------- |
| `--skill`             | ✅       | ✅    | Skill ID violated | `react/hooks`                      |
| `--issue`             | ✅       | ✅    | What went wrong   | `Missing cleanup`                  |
| `--skill-instruction` | ⚪       | ✅    | Quote from skill  | `"Always include cleanup..."`      |
| `--actual-action`     | ⚪       | ✅    | What you did      | `Created useEffect without return` |
| `--decision-reason`   | ⚪       | ✅    | Why you deviated  | `Missed requirement`               |
| `--context`           | ⚪       | ✅    | Framework/version | `React 18, StrictMode`             |
| `--model`             | ⚪       | ✅    | Your model        | `Claude 3.5 Sonnet`                |
| `--suggestion`        | ⚪       | ✅    | Proposed fix      | `Add cleanup example`              |
| `--loaded-skills`     | ⚪       | ⚠️    | Active skills     | `react/hooks,react/lifecycle`      |

**Legend**: ✅ = AI can auto-fill, ⚪ = Optional, ⚠️ = Needs platform support

## AI Auto-Report Guide

**Always include when applicable:**

1. `--skill-instruction`: Copy exact text from violated skill guideline
2. `--actual-action`: Describe what you did (e.g., "Used useState instead of useReducer")
3. `--decision-reason`: Explain why (e.g., "Prioritized simplicity over pattern")

**Privacy**: Only skill ID + descriptions sent. No code/paths/project data.
