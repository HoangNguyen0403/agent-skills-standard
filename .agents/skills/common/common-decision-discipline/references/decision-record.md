# Decision Record

Load this reference when classifying or recording a decision with `record_decision`.

## When to record

A decision is a materially different outcome chosen by the agent, with no human answer in that turn. The chosen outcome may be set by applying a named pre-approved rule (`basis: rule`) or by using a default when no rule covers it (`basis: default-pending-review`). An outcome explicitly selected by a human is not an agent decision. Routine tool use is not a decision. Record only a permitted choice; recording neither authorizes action nor replaces approval.

If an action requires human authorization, pause and obtain it before acting. Do not perform a blocked action and record it afterward. A permitted default taken to keep work moving is recorded as pending review; this status does not waive any separate gate.

## Classify

- `basis: rule`: the agent chooses an outcome by applying a named pre-approved rule, policy, or approved plan item. Include `ruleRef`, a concise identifier matching `^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,95}$`.
- `basis: default-pending-review`: no pre-approved rule covered the choice and the agent used a default. Omit `ruleRef`.
- `impact: high`: hard to reverse or touches authentication, money, data integrity, secrets, a trust boundary, public contract, release, or approved scope.
- `impact: medium`: reversible choice that changes behavior, interface, or scope inside assigned work.
- `impact: low`: reversible, local choice with no behavior or contract change. Round impact up when uncertain.
- `reversible`: the agent's honest assessment.
- `label`: concise, sanitized description, 1–120 characters after trimming. Do not include secrets or transcript excerpts.

## Worked calls

An authorized but unsettled choice between two reversible interface behaviors is taken as a default and should be reviewed:

```text
record_decision({
  basis: "default-pending-review",
  impact: "medium",
  reversible: true,
  label: "Use compact layout for the settings panel"
})
```

An approved plan item settles a reversible implementation choice:

```text
record_decision({
  basis: "rule",
  ruleRef: "plan:REQ-008",
  impact: "medium",
  reversible: true,
  label: "Use the approved canonical skill reference"
})
```

Use the MCP tool's structured arguments; include `basis`, `impact`, `reversible`, and `label` every time. Include `ruleRef` exactly for `rule` basis. The tool receipt confirms recording only; all figures remain agent-declared and unverified.

## Supersede And Invalidate

Specs are not frozen. When a decision changes approved scope, contract, or a requirement, record it ADR-lite:

```text
id: DEC-<n>                               # stable within the work item
date: <YYYY-MM-DD>                        # bookkeeping only; never the ordering key
decision: <one line: what changed and why>
supersedes: [DEC-<id>]                    # prior decisions this replaces; [] when none
supersedes_approval: <approval ref @ rev> # approval this decision supersedes
invalidates: [REQ-<id>, AC-<id>, SRS-<id>] # approved items this voids; [] when none
approver: <human>                         # human required for scope, contract, or safety changes
```

- `supersedes_approval`: the approval revision this decision retires. Ordering follows approval lineage, not dates or Git revisions, so same-day approval then invalidation stays detectable.
- `supersedes`: listed decisions stop governing once this record is approved; later work cites the new id, never the old one.
- `invalidates`: listed REQ/AC/SRS ids no longer hold. Every slice citing one is `BLOCKED-STALE` until a newer approval references this decision id as its resolution.
- Resolution covers only the invalidated items; unaffected criteria keep their approved revision and need no re-plan.
- An agent may draft such a record as pending approval; it never approves a scope or contract change itself.
- Field semantics are defined here only. Workflows reference this section instead of restating it.
