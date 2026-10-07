Handoff:

- Finding: `F-RESTORE` — Confirmed material gap. No joint database/media restore drill has measured recovery time or checked media-to-record associations.
- Action: `A-RESTORE-01`
- Risk/source/consequence: Recovery capability is unverified; restore may exceed the required RTO or produce orphaned/mismatched media. Source: trusted, author-confirmed review evidence.
- Bounded change: Within 14 calendar days, run one joint database/media restore drill in an isolated environment. Time-box execution to one business day; predeclare the RTO and association-reconciliation criteria, recording timestamps, recovery duration, failures, and results. Unknown targets remain `needs validation`.
- Role: Maintainer with on-call/storage operator.
- Dependencies: Restorable database and media backups, isolated restore environment, restore runbook, and data-owner validation criteria.
- Scoped exit proof: Drill artifacts show measured recovery time and completed media-to-record reconciliation, with discrepancies resolved or explicitly accepted.
- Status: `open`
- Release gate: Keep open until an independent approver records the decision and confirms the checked gate authority; a role alone is not acceptance.

```yaml
improvement_plan:
  status: response_only
  path: null
  missing:
    - "Initial plan-file write failed before any file existed; review and architecture-entry links were not written."
```

No file or saved artifact is claimed.
