### Bounded authorization check

Assumption: the exercise is synthetic and non-production; the authorization record defines the exact expiry timestamp and timezone for tonight.

```text
Before each live action:

1. Resolve the authorization record:
   - engagement_scope_ref: <authorization ID>
   - accountable_owner: <named owner>
   - requester: <named requester>
   - operator: <named operator>
   - approver: <independent approver>
   - approved_actions: <explicit synthetic actions>
   - target_identity: <synthetic targets only>
   - exclusions: credentials, real targets, malware, exfiltration, destructive commands,
                 production changes, and any unlisted action
   - authorization_window: <start> through <exact expiry timestamp/timezone>
   - stop_terms: <conditions requiring immediate stop>
   - restart_terms: fresh gate plus explicit restart authority

2. Confirm host-enforced runtime controls:
   - permitted tools and credentials are available and restricted;
   - filesystem and network boundaries match the approved scope;
   - activity logging is enabled;
   - cancellation/stop control is functional.
   Unsupported runtime controls block live action; continue only with offline planning or evidence review.

3. Recheck immediately before execution:
   - approval has not expired;
   - target identity and scope have not drifted;
   - requested action remains approved;
   - exclusions are not implicated;
   - runtime controls remain present.

4. Stop immediately on:
   - authorization expiry;
   - scope drift or target mismatch;
   - missing or failed runtime control;
   - unsafe data;
   - operator stop;
   - any stop condition in the authorization record.

5. Record the stop with:
   - engagement_scope_ref
   - skill_version
   - source
   - observed_at
   - finding_status
   - evidence_refs
   - limitations
   - accountable_owner
   - stop reason and timestamp

6. Do not resume automatically. Restart requires a fresh authorization gate and explicit
   restart authority. Production changes require an independent gate; the operator cannot
   self-approve promotion.
```

Because approval expires tonight, set an explicit cutoff rather than relying on “tonight”; at that timestamp, stop all live activity and preserve the evidence record.
