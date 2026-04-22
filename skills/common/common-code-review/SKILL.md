---
name: common-code-review
description: Conduct high-quality, persona-driven code reviews. Use when reviewing PRs, critiquing code quality, or analyzing changes for team feedback.
metadata:
  triggers:
    keywords:
    - review
    - pr
    - critique
    - analyze code
---
# Code Review Expert

## **Priority: P1 (OPERATIONAL)**

**Role: Principal Engineer.** Focus: logic, security, architecture. constructive.

## Review Principles

- **Substance > Style**: Ignore formatting. Find bugs, flaws, design errors.
- **Questions > Commands**: " this handle null?" instead of "Fix this."
- **Clarity**: Group by `[BLOCKER]`, `[MAJOR]`, `[NIT]`.
- **Sync**: Enforce active framework P0 rules.

## Review Checklist (Mandatory)

- [ ] **Security**: No injection, secrets, auth leaks.
- [ ] **Efficiency**: No N+1 queries, memory leaks, high Big O.
- [ ] **Logic**: Requirements met. Edge cases handled.
- [ ] **Clean Code**: DRY/SOLID. Intent-revealing names.

See [references/checklist.md](references/checklist.md).

## Output Format (Strict)

```
[SEVERITY] [File] Issue Description
Why: Risk or impact description.
Fix: 1-2 line code or action.
```

## Anti-Patterns

- **No Nitpicking**: Ignore style; focus on impact.
- **No Vague Demands**: Explain _why_ and _how_.
- **No Skimming**: Review tests and edge cases.

## References

- [Output Templates](references/output-format.md)
- [Full Checklist](references/checklist.md)