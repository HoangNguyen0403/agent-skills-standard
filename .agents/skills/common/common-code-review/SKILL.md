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

## **Priority: P1 (HIGH)**

**Role: Principal Engineer / senior review.** Focus: logic, security, architecture. constructive.

## Review Principles

- Substance > style. Find behavioral, security, and design defects; do not nitpick.
- Findings first; no strengths or praise section. Every finding cites evidence and explains risk.
- **Deterministic gate:** a current orchestrator-observed required-check `FAIL` returns `CHANGES REQUESTED` before semantic lens review. Missing, unknown, `NOT RUN`, or stale status is an evidence gap, never PASS.
- **Blind first:** phase one receives only the brief, cumulative diff, and orchestrator-observed check receipt. Freeze findings and SHA-256 before author claims; this declared sequence is not filesystem isolation.
- **Reproduce only when every provenance, host-enforced isolation, verified prevention of shared-worktree writes, no-credentials/no-publication, default-deny-network, and orchestrator-published-command predicate is verified.** Otherwise stay static-only and name the gap; never execute author-controlled commands in a privileged reviewer runtime.
- Compare authorized reproduction command, output, and source identity with the receipt. Observed/claimed mismatch is a Blocker.
- **Reconcile:** resume the same reviewer with frozen findings and digest plus author claims. If resume is unavailable, BLOCKED; replacement requires restarting the full blind phase.
- Review completeness includes test and edge-case coverage even when CI is green or the request is quick.
- **Test-Review Evidence Gate:** before a missing-test Major, identify the changed contract, plausible consumer-visible escaped fault, and evidence nearby/upstream suites do not cover it. One logical contract per test; do not demand tests per symbol.
- Independence and host provenance are verified separately; self-approval is forbidden. Missing optional metadata is a recorded gap; missing required scope evidence blocks approval.
- For complete phases and formats, load [Adversarial Review Protocol](references/adversarial-review.md). Load [orchestration](references/orchestration.md) when ticket/AC, PR metadata, or specialist lenses are needed.
## Review Checklist (Mandatory)

- [ ] **Security**: No injection, secrets, auth leaks.
- [ ] **Efficiency**: No N+1 queries, memory leaks, high Big O.
- [ ] **Logic**: Requirements met. Edge cases handled.
- [ ] **Clean Code**: DRY/SOLID. Intent-revealing names.

See [references/checklist.md](references/checklist.md).

## Output Format (Strict)

Use only `[Blocker]`, `[Major]`, or `[Nit]`. Each substantive finding has `Evidence:`, `Why:`, `Fix:`, and `Prevent-by: lint | type | test | eval | runtime | guidance | none`; missing code/diff means state the evidence needed. No praise section. See [finding template](references/output-format.md).

## Red Flags

- **Stop if you are praising before reviewing**: Start with findings.
- **Stop if a claim lacks evidence**: Mark it as assumption or inspect more.
- **Stop if you are reviewing style only**: Return to behavior, security, tests.

## Rationalization Prevention

- **"It probably handles that edge case"**: Probably is not evidence.
- **"CI is green so review is done"**: Tests do not replace review.
- **"Only style matters here"**: Ignore style, not behavioral risk.

## Anti-Patterns

- **No Nitpicking**: Ignore style; focus on impact.
- **No Vague Demands**: Explain _why_ and _how_.
- **No Skimming**: Review tests and edge cases.

## References

- [Output Templates](references/output-format.md)
- [Full Checklist](references/checklist.md)
- [Orchestration and Specialist Lanes](references/orchestration.md)
