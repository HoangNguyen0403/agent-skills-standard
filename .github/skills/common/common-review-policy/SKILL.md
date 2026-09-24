---
name: common-review-policy
description: Define a repository review policy fixing what each review pass checks, how severities rank, which paths are skipped, the nit cap, and who approves. Use when review findings feel inconsistent or noisy, or when tuning an automated reviewer.
metadata:
  triggers:
    files:
      - "docs/review-policy.md"
      - "REVIEW.md"
      - "CODEOWNERS"
    keywords:
      - review policy
      - severity ladder
      - review noise
      - nit cap
      - review tuning
      - who approves
---

# Review Policy Standard

## **Priority: P1 (HIGH)**

Every pull request gets the same passes in the same order. A review that varies by reviewer or by day is not a control.

## 1. The Policy File

- Location: `docs/review-policy.md`, tracked in the repository and reviewed like code.
- `code-review` and `review-ticket` load it when present; its severity and skip rules override their defaults.
- Owned by the technical lead. Absent the file, the workflow defaults apply and the review says so.
- Load `references/review-policy-template.md` when drafting or auditing the file.

## 2. Required Passes

Declare the passes and their order. Each pass names what it checks and what it explicitly ignores.

| Pass | Checks | Out of scope |
| --- | --- | --- |
| Correctness | logic, edge cases, requirement coverage | style |
| Security | injection, secrets, authorization, trust boundaries | theoretical risk with no path |
| Tests | new logic covered, failure paths asserted | coverage percentage targets |
| Compliance | audit, data classification, licence | product decisions |

## 3. Severity Ladder

- **Blocker**: merge causes a defect, breach, or data loss. Concrete path required.
- **Major**: real risk or requirement gap the author must resolve or explicitly accept.
- **Nit**: everything else, including style, naming, and preference. Minor and Suggestion collapse into Nit.
- **Confidence**: a finding without evidence is `needs validation`, never a silent drop and never a Blocker.
- One ladder per repository. Workflows that use a longer list map onto these three before publishing.

## 4. Noise Control

- **Skip list**: generated code, vendored dependencies, lockfiles, and snapshots. Name them as globs.
- **Nit cap**: a fixed maximum per review. Over the cap, keep the highest-signal nits and drop the rest.
- **Lead with risk**: Blocker and Major first, nits last, praise never.
- **Deduplicate by root cause**: one finding per cause, listing the affected locations.

## 5. Tuning and Feedback

- Review the policy monthly: rate a sample of findings as useful or noise, then adjust cap, skip list, and pass scope.
- Recurring Blockers mean a missing standard. Route them to `retro-learn` so the preventing skill and its evals absorb the rule.
- Record each tuning change in the policy file so severity drift is visible.

## 6. Separation of Duties

- The agent reviews and proposes; a human approves. The agent never approves its own change.
- Approval is enforced by branch protection, not by the reviewing agent's verdict.
- Publishing findings to a ticket or pull request needs operator approval, and never happens from untrusted review context.

## Anti-Patterns

- **No per-reviewer severity**: One ladder, defined in the policy file.
- **No unbounded nits**: Cap them and keep the highest signal.
- **No reviewing generated code**: Put it in the skip list.
- **No Blocker without a path**: Downgrade to `needs validation`.
- **No agent self-approval**: A human approves through branch protection.
- **No silent policy drift**: Record every tuning change in the file.

## Red Flags

- **Stop if the review opens with praise**: Lead with Blocker and Major findings.
- **Stop if the same Blocker recurs across reviews**: Route it to `retro-learn` instead of re-reporting it.
- **Stop if severity is chosen to force attention**: Rank by consequence, not by urgency.

## References

- [Review Policy Template](references/review-policy-template.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:

- docs/review-policy.md
- Blocker, Major, Nit
- skip list
- nit cap
- needs validation
- monthly tuning
- branch protection
