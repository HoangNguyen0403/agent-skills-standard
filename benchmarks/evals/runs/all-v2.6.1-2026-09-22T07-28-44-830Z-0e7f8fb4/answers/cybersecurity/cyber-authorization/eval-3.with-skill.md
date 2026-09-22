Stop live action immediately. Scope drift is a stop condition—do not continue under implied consent from a ticket, chat, or plan.

1. Record the stop reason and time with `engagement_scope_ref`, `accountable_owner`, `skill_version`, `source`, `observed_at`, `finding_status`, `evidence_refs`, and `limitations`.
2. Re-resolve the authorization: approved actions, exclusions, target identity, exercise window, and stop/restart terms.
3. Confirm host-enforced runtime controls for tools, credentials, filesystem, network, logging, and cancellation. Unsupported runtime blocks live action.
4. Resume only after the target list is explicitly reauthorized, a fresh gate passes, and separate restart authority approves it. The requester, operator, and approver must remain separate.
