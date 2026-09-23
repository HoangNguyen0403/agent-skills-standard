**Framework edge**

- **Observation:** During exercise `EX-2026-09-22-001`, endpoint `host-01` executed `powershell.exe -File update.ps1`.
- **Framework:** MITRE ATT&CK Enterprise v14
- **Stable ID:** `T1059.001` — PowerShell
- **Relation:** `observed-as`
- **Source:** [MITRE ATT&CK T1059.001](https://attack.mitre.org/techniques/T1059/001/)
- **Rationale:** Evidence record `EV-001` directly records PowerShell execution, which is consistent with the named ATT&CK technique.
- **Review status:** `unreviewed`
- **Engagement scope:** `engagement_scope_ref: EX-2026-09-22-001`
- **Skill version:** `cyber-framework-mapping; version unspecified`
- **Observed at:** `2026-09-22`
- **Finding status:** `observed`
- **Evidence refs:** `EV-001`
- **Limitations:** This is a single observed behavior; it does not establish control effectiveness, prevention, detection coverage, risk reduction, or compliance. Other mappings remain `unknown` unless separately evidenced.
- **Accountable owner:** `exercise-security-lead`

This mapping is an evidence-linked framework edge, not a compliance or control claim.
