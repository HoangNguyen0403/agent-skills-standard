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


## Scientific Method

1. **OBSERVE**: Gather data. What exactly happening?
 - Logs, Stack Traces, Screenshots, Steps to Reproduce.
2. **HYPOTHESIZE**: Formulate theory. "I think X causing Y because Z."
3. **EXPERIMENT**: Test theory.
 - Create reproduction case.
 - Change _one variable at time_ to validate hypothesis.
4. **FIX**: Implement solution once root cause proven.
5. **VERIFY**: Ensure fix works and doesn't introduce regressions.

## Anti-Patterns

- **No shotgun debugging**: Prove root cause before changing code.
- **No debug prints in production**: Remove all print/console.log before commit.
- **No symptom masking**: Fix root cause; never swallow errors without handling.

## Best Practices

- **Diff Diagnosis**: What changed since it last worked?
- **Minimal Repro**: Create smallest possible code snippet that reproduces issue.
- **Rubber Ducking**: Explain code line-by-line to inanimate object (or agent).
- **Binary Search**: Comment out half code to isolate failing section.

## References

- [Bug Report Template](references/bug-report-template.md)