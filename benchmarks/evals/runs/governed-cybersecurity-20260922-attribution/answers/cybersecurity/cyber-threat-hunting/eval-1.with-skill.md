Hypothesis: In the authorized synthetic endpoint-event dataset, unusual PowerShell execution may indicate suspicious activity when `powershell.exe` or `pwsh.exe` uses encoded commands, hidden windows, execution-policy bypass, download/cradle behavior, or suspicious parent processes. Correlate these events by host, user, process lineage, and timestamp.

Scope assumptions: synthetic/offline fixtures only; endpoint process telemetry; defined observation window and fixture provenance must be recorded. Preserve original fields and query/analytic version; normalize only derived copies. Stop when the authorized fixture/window is exhausted or telemetry gaps prevent reliable correlation.

Current status: `not-tested`—no events or scope reference were supplied, so no evidence reference can be cited.

A clean result means only: “No evidence found in the examined dataset/time window” for the defined PowerShell indicators. It is bounded negative evidence, not proof of no compromise. An empty, incomplete, or materially gapped dataset must not be called clean.

Record: engagement/scope reference, `cyber-threat-hunting` skill/source, observation time, query version, fixture provenance, retention and clock assumptions, evidence references, telemetry limitations, alternatives considered, and accountable hunt owner. Relevant evidence-handling and mapping references are `cyber-authorization`, `cyber-evidence`, `cyber-framework-mapping`, MITRE ATT&CK data sources, and NIST SP 800-86.
