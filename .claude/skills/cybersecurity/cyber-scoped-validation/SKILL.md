---
name: cyber-scoped-validation
guardrail: true
description: Validates bounded cybersecurity exercise observations against approved scope, expected behavior, runtime controls, and redacted evidence. Use when performing safe offline validation or authorized runtime checks with explicit stop and status gates.
metadata:
  labels: [cybersecurity, scoped-validation, red-team]
  triggers:
    keywords: [scoped validation, validate exercise result, authorized validation, scope check, runtime support check, validation evidence]
---
# Cyber Scoped Validation

## **Priority: P0 (CRITICAL)**

Validate one approved claim at a time; unsupported live controls produce a block, not a workaround.

## Structure

```text
cyber-scoped-validation/
├── SKILL.md
├── references/validation-record.md
└── evals/evals.json
```

## Workflow

1. Bind claim to engagement/scope reference, authorization window, exclusions, and expected observation.
2. Check required mode: safe offline analysis/replay or authorized lab validation.
3. For safe offline analysis or supplied evidence review, execute bounded observation without host mutations.
4. For active lab validation against disposable synthetic fixtures, route explicitly to [cyber-lab-validation](../cyber-lab-validation/SKILL.md); scoped-validation alone does not authorize active actions.
5. Observe within bounds, capture redacted evidence, and assign `finding_status` based on corroboration (`confirmed`, `suspected`, `blocked`, `not-tested`, `false-positive`). Retain prior corroborated findings if a retest step blocks.
6. Stop on expiry, drift, unsafe impact, or missing controls; route results to independent adjudication.
## Rules

- No exploit scripts, operational attack commands, real targets, malware, exfiltration, or credential collection.
- Scoped validation governs offline analysis and supplied evidence review. It does NOT execute active lab attacks or bypass runtime boundaries.
- Bounded lab handoff: When active validation in an isolated disposable lab is required, hand off to `cyber-lab-validation`. That skill requires independent host gates and does not grant blanket execution permission.
- Positive continuation: Unsupported runtime blocks active validation. Continue safe offline plan review, architecture analysis, or remediation drafting without halting independent work.
- Finding status is separate from step state: a blocked retest step never erases prior corroborated findings or forces them to not-tested (IR03).
- Do not invent observations, timestamps, approvals, or runtime attestations. With no supplied/exercised evidence, record `finding_status: not-tested` (AC-CLV-11).
## Anti-Patterns

- **No scope probing**: Do not discover beyond approved boundaries.
- **No control bypass**: Missing runtime support is a blocker.
- **No clean-by-default**: Missing evidence is not a pass.
- **No self-promotion**: Require independent adjudication.

## References

- [Validation record](references/validation-record.md)
- [Lab validation contract](../cyber-lab-validation/SKILL.md)
- [Authorization matrix](../cyber-authorization/references/runtime-authorization-matrix.md)
- [Evidence record](../cyber-evidence/references/evidence-record.md)
