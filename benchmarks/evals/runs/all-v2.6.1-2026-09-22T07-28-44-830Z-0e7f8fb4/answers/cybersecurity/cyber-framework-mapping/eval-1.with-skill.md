**Framework edge**

- **Observation:** During authorized exercise `EX-2026-09-22-001`, host `WS-014` executed `powershell.exe -enc <redacted>`.
- **Framework:** MITRE ATT&CK Enterprise v14
- **Technique:** `T1059.001 — PowerShell`
- **Source:** [MITRE ATT&CK T1059.001](https://attack.mitre.org/techniques/T1059/001/)
- **Relation:** `observed-as`
- **Rationale:** Evidence `EV-001` records PowerShell execution, matching the technique’s defined command-and-scripting interpreter behavior. This is an observation mapping, not proof of efficacy, coverage, or compliance.
- **Engagement scope:** `EX-2026-09-22-001`
- **Skill version:** `cyber-framework-mapping; version not provided`
- **Observed at:** `2026-09-22T10:00:00+07:00`
- **Finding status:** `observed`
- **Evidence references:** `EV-001` (process telemetry; command content partially redacted)
- **Limitations:** No conclusion about prevention, detection quality, impact, or complete ATT&CK coverage.
- **Accountable owner:** Exercise lead
- **Review status:** `unreviewed`
- **Other framework mappings:** `unknown; not assessed`
