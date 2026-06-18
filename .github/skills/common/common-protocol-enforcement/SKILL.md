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

1. **Adversarial Audit**: Search for Standard Defaults where project rules should exist.
2. **Protocol Check**: Confirm active skills and workflows were loaded before writing.
3. **Evidence Check**: Ask what command or artifact proves the completion claim.
4. **Execution Bias Check**: Ask whether speed or convenience skipped a structural rule.

## ** Post-Write Self-Scan**

Immediately after tool call:

- **Scan**: Read diff or file content.
- **Match**: Check against `Anti-Patterns` in all active skills.
- **Fix**: Re-edit immediately if violation detected.

## Red Flags

- **Stop if "done" appears before fresh verification**: No completion claim yet.
- **Stop if you relied on memory instead of re-reading files**: Reload source of truth.
- **Stop if the shortcut is "small enough to skip protocol"**: Small changes hide drift.

## Rationalization Prevention

- **"The change is tiny"**: Tiny changes still violate guardrails.
- **"The test passed earlier"**: Old evidence does not prove current state.
- **"I know the pattern already"**: Load the active skill anyway.

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
