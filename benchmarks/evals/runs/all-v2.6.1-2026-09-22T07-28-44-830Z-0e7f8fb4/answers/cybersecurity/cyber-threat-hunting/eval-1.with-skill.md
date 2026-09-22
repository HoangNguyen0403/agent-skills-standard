Hypothesis: In the authorized synthetic endpoint-event fixture, within the stated time window, an unusual PowerShell execution occurred—e.g., `-enc`/`-EncodedCommand`, `IEX`, `FromBase64String`, `DownloadString`, `WebClient`, hidden execution, execution-policy bypass, or an anomalous parent process such as Office or a browser.

Scope and method:

- Entities: endpoint, user, PowerShell process, parent process, command line, and timestamp.
- Sources: synthetic endpoint process/command-line events; preserve fixture provenance, retention, clock, and original fields.
- Expected signal: one or more suspicious PowerShell indicators, correlated by entity and time.
- Stop condition: examine the complete authorized fixture/window, or mark the hunt `blocked`/`not-tested` if data is empty, incomplete, or unavailable.
- Normalize into derived fields without overwriting originals, then test the narrowest evidence and record positive and negative observations.

Status without the fixture: `not-tested`.

A clean result means: “No evidence found in the examined complete synthetic dataset and time window for the specified unusual-PowerShell indicators.” It is bounded negative evidence—not proof of no compromise or absence of PowerShell abuse. An empty or incomplete dataset must never be called clean; document the telemetry gap and alternative explanations such as missing command-line logging, truncation, clock skew, or obfuscation.

Record the query/version, observation time, evidence references/event IDs, scope or engagement reference, skill/source (`cyber-threat-hunting`), limitations, and accountable owner.
