Treat as a high-priority suspected credential-compromise incident.

- Preserve the memory image unchanged. Record its custodian and acquisition timestamp, calculate and document a hash, and maintain chain of custody.
- Do not isolate the host under the expired approval. Request renewed, explicit authorization for host isolation and define the approved scope.
- While authorization is pending, perform non-destructive triage: analyze the image offline for credential material, LSASS or equivalent access, injected processes, browser tokens, active sessions, persistence, and suspicious network indicators. Correlate with endpoint, authentication, and network logs.
- If compromise is confirmed, contain only within currently valid authority; otherwise escalate to the incident owner/security approver for the isolation decision.
- Preserve findings, actions, approvals, and timestamps in the incident record.

Assumption: no standing emergency-containment authority exists that remains valid despite the expired host-isolation approval.
