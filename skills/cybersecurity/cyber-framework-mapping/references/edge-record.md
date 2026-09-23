# Framework Edge Record

```text
framework: [name]
version: [published version]
id: [stable framework or technique ID]
relation: supports | describes | observed-as | partial | unknown | conflicts
rationale: [bounded reason tied to evidence]
source: [primary URL or document section]
review_status: reviewed | needs-review | unreviewed
reviewer: [role or name when reviewed]
reviewed_at: [UTC timestamp when reviewed]
```

Use `unknown` values when no reviewed edge exists. Preserve source version and review date. Mapping is catalog context; it does not establish control operation, efficacy, authorization, or compliance.

Primary sources: [NIST CSF 2.0](https://www.nist.gov/cyberframework); [NIST SP 800-115](https://csrc.nist.gov/pubs/sp/800/115/final); [MITRE ATT&CK](https://attack.mitre.org/).
