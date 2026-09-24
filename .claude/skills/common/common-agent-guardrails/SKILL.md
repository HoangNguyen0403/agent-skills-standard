---
name: common-agent-guardrails
description: Define deterministic guardrails for agent tool calls — protected paths, test-file locks during bug fixes, post-edit formatters, production approval gates, secret deny rules. Use when writing or reviewing a hook policy, or moving an always-do-X rule out of prose into enforcement.
metadata:
  triggers:
    files:
      - "guardrails.yaml"
      - "hooks.json"
      - ".claude/settings.json"
      - "**/hooks/*.py"
      - "**/hooks/*.js"
    keywords:
      - guardrail
      - protected path
      - block edit
      - approval gate
      - hook policy
      - pretooluse
---

# Agent Guardrail Standard

## **Priority: P1 (HIGH)**

A rule that must always hold belongs in a hook, not in a prompt. Prompts persuade; hooks decide.

## 1. What Belongs in a Guardrail

- **Absolute compliance only**: encode a rule here when a single violation is unacceptable, not when it is merely preferred.
- **Deterministic check**: the decision must be computable from tool name, arguments, and repo state — never from model judgment.
- **Paired with a skill**: the skill teaches the rule, the guardrail enforces it. Ship both or the rule decays.

## 2. Required Guardrail Classes

| Class | Trigger | Decision |
| --- | --- | --- |
| Protected paths | edit to generated, vendored, or frozen files | block |
| Secret deny | edit or read of `.env*`, `.ssh/`, `credentials*.json\|yaml`, identity files | block |
| Test lock | test-file edit while a bug-fix workflow is active | block |
| Formatter | after any accepted edit | run, then report |
| Production action | deploy, migration, or destructive command against production | ask named owner |
| Scope fence | writes outside the declared task scope | ask |

## 3. Decision Semantics

- **Exit 0**: allow, stay silent. Reserve stdout for the formatter class.
- **Exit 2**: block. Print the rule violated and the sanctioned alternative on stderr, never a generic denial.
- **Any other exit**: ask a human. Use it when the check is inconclusive, not as a soft block.
- **Fail closed on production classes**: if the guardrail cannot evaluate, treat production actions as blocked.

## 4. Test Lock During Bug Fixes

- Write the failing test first; the agent proves the bug reproduces before touching production code.
- Lock every test path for the duration of the fix so the proof cannot be weakened into passing.
- Unlock only when the fix is verified, or when the operator states the test itself is the defect.

## 5. Placement and Ownership

- **Team level**: repository-tracked config, reviewed in pull requests like code.
- **Organization level**: managed settings the project cannot override; use for secret deny and production gates.
- **Log every decision**: timestamp, rule, tool, target, and outcome. An unlogged block is unauditable.
- **Version the policy**: a guardrail change is a control change and needs the same review as the control it enforces.

## Anti-Patterns

- **No prompt-only rules**: If it must always hold, enforce it in a hook.
- **No broad path globs**: Name the protected directories, not the whole repo.
- **No silent blocks**: Print the rule and the allowed alternative.
- **No agent self-approval**: A human role authorizes production actions.
- **No guardrail without a skill**: Pair enforcement with the rule that explains it.
- **No unlogged decisions**: Record every block and ask.

## Red Flags

- **Stop if "just this once, disable the hook"**: Re-run with the sanctioned path or escalate to the policy owner.
- **Stop if the fix edits the failing test**: Restore the test and fix the production code.
- **Stop if a production command runs with no named authorizer**: Block and request sign-off.

## References

- [Guardrail Policy Template](references/guardrails-template.yaml)
- [Runtime Adapters](references/runtime-adapters.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:

- exit 2 blocks
- protected paths
- test lock
- approval gate
- fail closed
- log the block decision
