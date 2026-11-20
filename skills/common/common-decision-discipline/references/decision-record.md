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
