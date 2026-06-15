---
name: common-debugging
description: Troubleshoot systematically using the Scientific Method. Use when debugging crashes, tracing errors, diagnosing unexpected behavior, or investigating exceptions.
metadata:
  triggers:
    keywords:
    - debug
    - fix bug
    - crash
    - error
    - exception
    - troubleshooting
---
# Debugging Expert

## **Priority: P1 (OPERATIONAL)**

## Root-Cause Protocol

1. **OBSERVE**: Gather error, logs, repro steps, recent diffs.
2. **REPRODUCE**: Make the failure happen on demand or gather more evidence.
3. **HYPOTHESIZE**: State one hypothesis in plain language.
4. **EXPERIMENT**: Change one variable to prove or kill the theory.
5. **FIX**: Touch code only after root cause proven.
6. **VERIFY**: Re-run the failing case and regression checks.

## Red Flags

- **Stop if you are changing code before repro**: You are guessing.
- **Stop if fix #2 starts before understanding fix #1**: Re-open root cause.
- **Stop if "quick patch for now" appears**: Symptom masking starts there.

## Rationalization Prevention

- **"The bug is obvious"**: Obvious bugs still need evidence.
- **"I already tried a few things"**: That means you need structure.
- **"It only fails in prod"**: Gather prod evidence, do not invent local myths.
- **Minimal repro first**: A minimal reproduction beats more random fixes.

## Anti-Patterns

- **No shotgun debugging**: Prove root cause before changing code.
- **No debug prints in production**: Remove all print/console.log before commit.
- **No symptom masking**: Fix root cause; never swallow errors without handling.

## References

- [Bug Report Template](references/bug-report-template.md)
