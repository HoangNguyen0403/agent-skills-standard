---
name: common-protocol-enforcement
description: Enforce Red-Team verification and adversarial protocol audit. Use when verifying tasks, performing self-scans, or checking for protocol violations. Load as composite for all sessions.
metadata:
  triggers:
    keywords:
    - verify done
    - protocol check
    - self-scan
    - pre-write audit
    - task complete
    - audit violations
    - retrospective
    - scan
    - red-team
---
# Protocol Enforcement (Red-Team Verification)

## **Priority: P0 (CRITICAL)**


## Red-Team Verification Protocol

Before declaring any task "done" or calling `notify_user`:

1. **Adversarial Audit**: Search for code patterns that look like "Standard Defaults" (e.g., hardcoded values, generic library calls) where Project Skill exists.
2. **Protocol Check**: Ensure "Pre-Write Audit Log" present for EVERY write tool call.
3. **Execution Bias Check**: Ask: " I skip structural constraint to make code run faster/pass test?"

## ** Post-Write Self-Scan**

Immediately after tool call:

- **Scan**: Read diff or file content.
- **Match**: Check against `Anti-Patterns` in all active skills.
- **Fix**: Re-edit immediately if violation detected.

## Anti-Patterns

- **No "Done" Bias**: Functional success != Protocol success.
- **No Reliance on Memory**: Always retrieval-led (Skill view_file) before write.
- **No Skipping Protocols**: "Small changes" where most violations happen.

## Execution Bias Detection

Look for:

- Local mocks instead of shared fakes.
- Hardcoded styles instead of design tokens.
- Try-catch blocks without standard error handling.
- Missing `Pre-Write Audit Log` in thoughts.

## References