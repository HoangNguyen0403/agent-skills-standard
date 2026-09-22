The catalog should preserve an explicit unresolved record, not infer a mapping or complete catalog:

```yaml
framework: "<framework name>"
framework_version: unknown
stable_id: unknown
relation: unknown
rationale: "No reviewed evidence establishes a framework relationship."
source: "<exact framework URL or document section, if available>"
review_status: unreviewed
reviewer: null
reviewed_at: null
engagement_scope_ref: "<scope reference>"
skill_version: "<mapping skill version>"
observed_at: "<timestamp>"
finding_status: "<status>"
evidence_refs: []
limitations:
  - "Framework revision is unclear."
  - "No reviewed edge exists."
accountable_owner: "<owner>"
```

Keep the edge empty or marked `unknown` until the framework revision, version-qualified stable ID, primary source, relation (`supports`, `describes`, `observed-as`, `partial`, or `conflicts`), and bounded evidence-based rationale are verified. Mark it `needs-review` once actionable source material exists, then re-review it whenever the framework version or source changes. Do not treat the mapping as proof of efficacy, coverage, compliance, or control effectiveness.
