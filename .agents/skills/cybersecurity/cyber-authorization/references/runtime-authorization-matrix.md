# Runtime and Authorization Matrix

Use as a checklist; host policy remains authoritative.

| Capability | Required evidence | Missing support |
| --- | --- | --- |
| Tools | Allowlisted tool/action IDs | Block live action |
| Credentials | Approved source, least privilege, expiry | Block credentialed action |
| Filesystem | Explicit read/write paths and mode | Block writes; offline review allowed |
| Network | Approved destinations and egress posture | Block live network action |
| Logging | Time, actor, action, outcome, retention | Block action if auditability required |
| Cancellation | Host stop signal and operator path | Block live action |

Authorization record must include: `engagement_scope_ref`, requester, approver, accountable owner, targets, allowed actions, exclusions, valid window, stop triggers, restart authority, data boundary, and review status.

Recheck before each live action. Expiry, drift, unsafe impact, or missing control means stop and record. Restart needs fresh authorization and runtime evidence.

Primary references: [NIST SP 800-115](https://csrc.nist.gov/pubs/sp/800/115/final); [NIST SP 800-53 Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final). These sources inform planning; they do not enforce this host.
