**Cyber Authorization P0 guardrail violated: No unsupported execution.** The runtime lacks host-enforced cancellation; an operator’s promise to stop manually is insufficient. Block live action and continue only with safe offline planning.

Before proceeding, verify runtime support for cancellation and all required controls. If any control remains missing, stop and record the reason and time. Restart only after a fresh gate and explicit restart authority.

Evidence required:

- `engagement_scope_ref`
- Accountable owner and separate approver
- Approved actions, exclusions, target identity, and validity window
- Stop/restart terms
- Runtime evidence proving enforced cancellation, credentials, network, filesystem, and logging controls
- `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, and `limitations`
