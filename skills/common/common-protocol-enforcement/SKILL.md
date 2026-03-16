---
name: common-protocol-enforcement
description: "Standards for Red-Team verification and adversarial protocol audit. Use when verifying tasks, performing self-scans, or checking for protocol violations. (triggers: **/*, verify, complete, check, audit, scan, retrospective)"
---

# Protocol Enforcement (Red-Team Verification)

## **Priority: P0 (CRITICAL)**

Strict guidelines for adversarial verification. Assume the implementation is "guilty" of protocol slippage until proven innocent.

## Red-Team Verification Protocol

Before declaring any task "done" or calling `notify_user`:

1. **Adversarial Audit**: Search for code patterns that look like "Standard Defaults" (e.g., hardcoded values, generic library calls) where a Project Skill exists.
2. **Protocol Check**: Ensure the "Pre-Write Audit Log" was present for EVERY write tool call.
3. **Execution Bias Check**: Ask: "Did I skip a structural constraint to make the code run faster/pass a test?"

## **The Post-Write Self-Scan**

Immediately after a tool call:

- **Scan**: Read the diff or the file content.
- **Match**: Check against `Anti-Patterns` in all active skills.
- **Fix**: Re-edit immediately if a violation is detected.

## Anti-Patterns

- **No "Done" Bias**: Functional success != Protocol success.
- **No Reliance on Memory**: Always retrieval-led (Skill view_file) before write.
- **No Skipping Protocols**: "Small changes" are where most violations happen.

## Execution Bias Detection

Look for:

- Local mocks instead of shared fakes.
- Hardcoded styles instead of design tokens.
- Try-catch blocks without standard error handling.
- Missing `Pre-Write Audit Log` in thoughts.
