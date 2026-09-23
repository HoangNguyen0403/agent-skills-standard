## Bounded Authorization Check — Synthetic Exercise

**Assumption:** This is an authorized synthetic exercise with no real targets, credentials, malware, exfiltration, destructive commands, or production changes. The approval expires at **23:59 local time tonight**; replace this with the recorded expiry timestamp before use.

```text
classify_request = "authorized synthetic exercise / bounded live simulation"

authorization:
  engagement_scope_ref: "<approval or engagement record ID>"
  accountable_owner: "<named owner>"
  requester: "<separate requester>"
  operator: "<separate operator>"
  approver: "<separate approver>"
  approved_actions: ["<explicit simulation actions>"]
  exclusions:
    - real targets
    - credentials
    - malware
    - exfiltration
    - destructive commands
    - production changes
  window:
    starts_at: "<timestamp>"
    expires_at: "<tonight's exact timestamp>"
  stop_terms:
    - authorization expiry
    - scope drift
    - target-identity mismatch
    - unsafe data
    - missing runtime control
    - operator stop
  restart_terms:
    - stop immediately
    - record reason and time
    - restart only after a fresh gate
    - require explicit restart authority

runtime_controls:
  tools_supported: true
  credentials_available_and_scoped: false
  filesystem_supported_and_bounded: true
  network_supported_and_bounded: "<confirm; otherwise false>"
  logging_supported: true
  cancellation_supported: true
```

Immediately before each live action, require all checks to pass:

```text
ALLOW only if:
  now < authorization.window.expires_at
  AND target identity is synthetic and matches approved scope
  AND requested action is explicitly approved
  AND no exclusion is involved
  AND runtime tools, filesystem, network, logging, and cancellation controls are supported
  AND operator, requester, and approver roles remain separated
  AND no scope drift is detected
  AND no unsafe data or real credentials are present
```

If any check fails, **STOP**. Do not continue after expiry or scope drift. Record the stop reason and time. Unsupported runtime controls block live action but do not block safe offline analysis or plan drafting.

Do not treat a ticket, chat, or plan as implied consent. Any production change requires an independent gate and must not be self-approved by the operator.

Record each decision with:

```text
engagement_scope_ref: "<ID>"
skill_version: "<version>"
source: "<approval record>"
observed_at: "<timestamp>"
finding_status: "allowed | blocked | stopped"
evidence_refs: ["<approval>", "<scope>", "<runtime-check>", "<logs>"]
limitations: ["<known limitations>"]
accountable_owner: "<name>"
```

At the expiry timestamp, automatically block further actions. Resumption requires a fresh authorization check and explicit restart authority.
