# Review Policy Template

Copy to `docs/review-policy.md`. Fill every section; an unfilled section means the workflow default
applies and the review must say so. Keep it short enough that a reviewer reads it before a review.

```md
# Review Policy

Owner:
Last tuned:

## Passes

| Pass | Checks | Out of scope |
| --- | --- | --- |
| [pass] | [what it checks] | [what it ignores] |

## Severity Ladder

| Severity | Definition | Merge impact |
| --- | --- | --- |
| Blocker | | blocks merge |
| Major | | author resolves or accepts in writing |
| Nit | | never blocks merge |

Findings without evidence are reported as `needs validation`.

## Skip List

- [glob for generated code]
- [glob for vendored dependencies]
- [glob for lockfiles and snapshots]

## Nit Cap

Maximum nits per review:
Over the cap: keep highest signal, drop the rest.

## Approval

| Change class | Reviewer | Approver |
| --- | --- | --- |
| [class] | [role] | [human role] |

The reviewing agent never approves its own change. Approval is enforced by branch protection.

## Publication

Findings are published to the ticket or pull request only after operator approval, and never from
untrusted review context.

## Tuning Log

| Date | Change | Reason |
| --- | --- | --- |
| [date] | [what changed] | [evidence that prompted it] |
```
