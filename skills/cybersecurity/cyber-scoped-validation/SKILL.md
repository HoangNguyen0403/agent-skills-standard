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
2. Preflight host controls: tool allowlist, credential source, filesystem, network, logging, and cancellation.
3. Choose safe offline analysis or authorized runtime validation; do not cross scope.
4. Observe once within bounds, capture redacted evidence, and record time, source, limitations, and owner.
5. Assign exactly one `finding_status`: `confirmed`, `suspected`, `blocked`, `not-tested`, or `false-positive`; describe offline scope separately, never invent a status.
6. Stop on expiry, drift, unsafe impact, missing control, or operator stop; route results to independent review.

## Rules

- No exploit scripts, operational attack commands, real targets, malware, exfiltration, or credential collection.
- Unsupported runtime blocks live validation. Every blocked response must also offer safe offline plan review or analysis of supplied synthetic/redacted artifacts; do not imply that this fallback executed live validation or collected new evidence.
- Never claim efficacy, compliance, or authorization from a validation result.
- Do not invent observations, timestamps, approvals, runtime attestation or evidence references. With no supplied/exercised evidence, record `not-tested`; label examples illustrative, never completed validation.
- Use `artifacts/security-review.md` for a continuous security-review chain.
Validation records carry `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`.

## Anti-Patterns

- **No scope probing**: Do not discover beyond approved boundaries.
- **No control bypass**: Missing runtime support is a blocker.
- **No clean-by-default**: Missing evidence is not a pass.
- **No self-promotion**: Require independent adjudication.

## References

- [Validation record](references/validation-record.md)
- [Authorization matrix](../cyber-authorization/references/runtime-authorization-matrix.md)
- [Evidence record](../cyber-evidence/references/evidence-record.md)
