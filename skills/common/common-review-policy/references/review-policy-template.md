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

## Criticality Map

| Class | Glob | Reason |
| --- | --- | --- |
| [trunk|shared|leaf] | [repo-relative pattern] | [owner rationale] |
| trunk | .skills-lock.json | Root ownership ledger; immutable control |

Use exactly one `Criticality Map` table with this header; classes are `trunk`, `shared`, or `leaf`. Patterns are case-sensitive repo-relative POSIX globs.

The checker grammar is exactly one unfenced `## Criticality Map` heading and one table with the exact `Class | Glob | Reason` header. Each row needs one class (`trunk`, `shared`, or `leaf`), a nonempty glob, and a nonempty reason.

Patterns are case-sensitive repo-relative POSIX paths: `*` matches one component, `**` spans components, and a terminal `/` covers descendants. Highest matching class wins; unmatched paths are `shared`.

Reject absolute paths, `..` traversal, empty path components (except the terminal `/` descendant operator), negation, brackets, escaped pipes, duplicate headings, and malformed rows. Missing policy/map yields `unclassified` and current human review; a malformed map exits 2. The future `review_gate` consumes this same grammar; define no second syntax.


Classification reads this policy from the independently selected base. Unmatched paths are shared; absent policy/map is unclassified and retains current human review. The selected policy path, `docs/review-policy.md`, review gate, root `.skills-lock.json` ownership ledger, `CODEOWNERS`, `.github/CODEOWNERS`, `docs/CODEOWNERS`, and generated integrity outputs are trunk controls regardless of map or skip-list content.


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

| Change class | Reversibility | Review level | Reviewer | Approver | Owner grant reference |
| --- | --- | --- | --- | --- | --- |
| [class] | [gated|revertible|one-way] | [line-review|hunk-review|report-only] | [role] | [human role] | [reference or none] |

Only an explicit human owner grant can set a reduced level. Hunk-review lists are minimum attention, never a reading limit. Trunk, sensitive, and one-way changes always require line-review; mixed changes take the strongest obligation. Human merge approval remains required.

## Report-Only Eligibility

Report-only is ALWAYS DISABLED in this implementation, even when complete M3 evidence, owner-set thresholds, or a purported human grant are supplied. Any future activation requires a separately approved contract change; this template defines no runtime conditional.

See [trust calibration](trust-calibration.md) for independent seed cohorts, spot audits, and post-grant escape handling.

For a future contract change only: report-only eligibility requires complete, independently checked M3 calibration/outcome evidence, thresholds explicitly set by the policy owner, and an explicit human grant for eligible leaf, reversible scope. No default thresholds are implied; missing evidence is unavailable, never zero.


The reviewing agent never approves its own change. Approval is enforced by branch protection.

## Publication

Findings are published to the ticket or pull request only after operator approval, and never from
untrusted review context.

## Tuning Log

| Date | Change | Reason |
| --- | --- | --- |
| [date] | [what changed] | [evidence that prompted it] |
```
