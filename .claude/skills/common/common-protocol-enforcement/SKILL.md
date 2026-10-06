---
name: common-protocol-enforcement
description: Enforce Red-Team verification and adversarial protocol audit. Use only when verifying completion, performing self-scans, or checking protocol violations; do not activate for ordinary implementation, configuration, or unit-test requests.
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
3. **Evidence Check**: Ask what observable command or artifact proves the completion claim.
4. **Execution Bias Check**: Ask whether speed or convenience skipped a structural rule.

## Risk-Based Post-Write Self-Scan

Trigger a post-write self-scan under specific risk or freshness conditions:
- **Condition**: State freshness is uncertain, external modifications occurred, tool output indicated partial edits or conflicts, or changes touch sensitive paths (auth, security, payments, data integrity).
- **Scan**: Inspect the diff or touched section rather than ritualistic re-reading of entire files.
- **Match**: Check against `Anti-Patterns` in all active skills.
- **Fix**: Re-edit immediately if a violation is detected.

## Red Flags

- **Stop if "done" appears before fresh verification**: Require observable evidence (test output, diff check, diagnostic artifact).
- **Stop if assuming stale file state is intact**: Verify source of truth when freshness is uncertain or tools signal ambiguity.
- **Stop if the shortcut is "small enough to skip protocol"**: Small changes hide drift.

## Rationalization Prevention

- **"The change is tiny"**: Tiny changes still violate guardrails.
- **"The test passed earlier"**: Old evidence does not prove current state.
- **"I know the pattern already"**: Verify active project rules anyway.

## Anti-Patterns

- **No "Done" Bias**: Functional success does not equal protocol success without proof.
- **No Unconditional Reread Loops**: Inspect diffs and files conditionally on risk and freshness, not on every tool call.
- **No Skipping Protocols**: "Small changes" are where most violations happen.
- **No Unobservable Completion**: Completion claims must be backed by executed commands or inspectable artifacts.

## Execution Bias Detection

Look for:

- Local mocks instead of shared fakes.
- Hardcoded styles instead of design tokens.
- Try-catch blocks without standard error handling.
- Missing `Pre-Write Audit Log` in thoughts.
