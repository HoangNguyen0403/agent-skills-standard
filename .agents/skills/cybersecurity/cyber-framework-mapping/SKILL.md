---
name: cyber-framework-mapping
guardrail: true
description: Maintains sparse, reviewable cybersecurity framework edges with versioned IDs, relation, rationale, source, and review status. Use when mapping exercise observations or procedures to NIST, ATT&CK, or another named framework.
metadata:
  labels: [cybersecurity, framework-mapping, provenance]
  triggers:
    keywords: [framework mapping, control mapping, ATT&CK mapping, NIST mapping, framework edge, mapping review]
---
# Cyber Framework Mapping

## **Priority: P1 (HIGH)**

Map only evidenced relationships; catalog context is not proof of efficacy, compliance, or coverage.

## Structure

```text
cyber-framework-mapping/
├── SKILL.md
├── references/edge-record.md
└── evals/evals.json
```

## Workflow

1. Name framework, version, stable ID, and exact source URL or document section.
2. Choose relation (`supports`, `describes`, `observed-as`, `partial`, `unknown`, or `conflicts`).
3. Write a bounded rationale tied to an evidence record, not a generic similarity.
4. Set review status: `reviewed`, `needs-review`, or `unreviewed`; include reviewer and date when reviewed.
5. Preserve empty or unknown mappings explicitly; do not infer a complete catalog.
6. On a version/source change, preserve the prior versioned edge and its evidence unchanged. Create a separately versioned candidate linked to the prior record, mark it `needs-review`, and re-review; never overwrite historical mappings.

## Rules

- Prefer primary framework publications and official technique catalogs.
- Keep framework IDs version-qualified; never silently merge revisions.
- Separate a mapped edge from a control claim, measured efficacy, or compliance assertion.
- Link [shared evidence fields](../cyber-evidence/SKILL.md) for observation provenance.
For mapped observations, carry `engagement_scope_ref`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, `limitations`, and `accountable_owner`.

## Anti-Patterns

- **No broad equivalence**: One keyword does not establish a mapping.
- **No version drift**: Do not reuse an ID without checking its revision.
- **No compliance leap**: Mapping never certifies a control or outcome.
- **No fabricated completeness**: Mark unknown edges and gaps.

## References

- [Framework edge schema](references/edge-record.md)
