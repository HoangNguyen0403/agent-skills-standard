# Outcome-Driven Guidance

Load when writing an authoring brief, a labeled illustration, or a corrective assignment. Host/core policy outranks this reference; reference it rather than restating it. Keep canonical wording portable: no model names, provider knobs, chat channels, containers, or mount paths.

## Obligation classification

| Class           | Test                                                                                      | Disposition                                           | Example                                        |
| --------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| Hard invariant  | Would waiving it change authority, safety, privacy, evidence honesty, or a required gate? | Preserve; escalate an ambiguous case                  | "Independent review is required before merge." |
| Method default  | Is it a preferred technique whose outcome can be met another way?                         | Adapt with evidence inside the same scope             | "Run the focused suite first."                 |
| Task constraint | Did the current brief set scope, output shape, or environment?                            | Bind that task only                                   | "Report in the existing task summary."         |
| Reference       | Is it detail needed only in some cases?                                                   | Move to `references/` when discovery remains reliable | Full schema or recovery procedure              |

If two classes seem plausible, keep the stronger obligation and ask for a decision. Never downgrade a hard invariant to a method default to make a rewrite shorter.

## Outcome brief

State only fields that add information; a simple task may use sentences.

```text
Outcome: <observable end state>
Context: <sources and current state that matter>
Acceptance: <criteria a reviewer can check>
Scope and authority: <allowed changes; actions requiring approval>
Delegated choices: <methods the agent may select>
Evidence and stop: <proof required; stop when every criterion is met>
```

An unrelated improvement is a proposal, not permission to expand scope. Ask only for a material decision the tools cannot resolve.

## Delegated method

- Name the outcome and boundaries; let the agent choose method inside them.
- Prescribe exact order only where dependency, auditability, or safety requires the order.
- A failed method may be replaced when new evidence justifies it; if interchangeability with the required evidence is unproven, retain the current method or escalate the ambiguity instead of assuming a method default.
- Urgency never waives a gate.
- Preserve required evidence tiers and review separation regardless of the chosen method.

## Labeled illustration

Use an illustration when an ambiguous output shape is clearer with a sample. Mark it, isolate it, and do not let it resemble a completed result.

```text
Illustrative shape — not an observed run:
<field>: <placeholder or shape description>
```

Do not ship a sample that looks like a reported result:

```text
Incorrect: a completed PASS row with invented values.
```

## Evidence-driven correction

1. State the mismatch between the required outcome and the current result.
2. Cite the evidence that shows the mismatch (failing check, observed state, reviewer finding).
3. Name the failed acceptance criterion.
4. Set the permitted repair boundary and the scope that must stay unchanged.
5. Do not retry or change method on unchanged evidence; first obtain new evidence or a specific evidence-backed hypothesis or input, otherwise stop and name the missing input.
6. Verify only the affected behavior and report the residual uncertainty.
