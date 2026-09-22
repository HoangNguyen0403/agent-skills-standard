# Cybersecurity Framework Map

Sparse catalog only. An edge is not proof of efficacy, authorization, or compliance. Re-review when source versions change.

## Candidate edges pending maintainer review

```yaml
- framework: NIST SP 800-115
  version: "2008"
  id: "Rules of Engagement"
  relation: supports
  rationale: "Primary guidance names rules-of-engagement planning; this catalog edge supports plan structure only."
  source: https://csrc.nist.gov/pubs/sp/800/115/final
  review_status: needs-review
- framework: NIST CSF
  version: "2.0"
  id: GV.OC
  relation: describes
  rationale: "Governance context is a candidate context for engagement boundaries; it is not an authorization control."
  source: https://www.nist.gov/cyberframework
  review_status: needs-review
```

## Explicit gaps

```yaml
- framework: unknown
  version: unknown
  id: unknown
  relation: unknown
  rationale: "No reviewed edge supplied for this observation."
  source: not-supplied
  review_status: unreviewed
```

## Use

- Add one version-qualified edge per evidenced relationship.
- Preserve `partial`, `unknown`, and `conflicts`; never fill gaps with keyword similarity.
- Cite primary publications or official catalogs. Record reviewer and date in the edge record.
- Keep mappings separate from shared evidence, authorization, and measured outcomes.

See [edge schema](../cyber-framework-mapping/references/edge-record.md).
