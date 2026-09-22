Authorization check for synthetic exercise

- Approval: Confirm written approval for this synthetic exercise is active and expires at **23:59 tonight, [timezone]**.
- Scope: Limit activity to the explicitly approved synthetic targets, accounts, data, and techniques.
- Exclusions: No production systems, real user data, third-party infrastructure, or targets not named in the approval.
- Time window: Begin only after approval is verified; stop all activity before the stated expiry.
- Limits: Use the minimum traffic, privileges, and test data necessary to validate the exercise.
- Stop conditions: Stop immediately on scope deviation, unexpected impact, real-data exposure, loss of authorization, or expiry.
- Evidence: Record authorization reference, scope, timestamps, actions, results, and any deviations.
- Assumption: “Tonight” means the approval’s stated local timezone and end-of-day timestamp; if that timestamp or timezone is not explicit, authorization is not yet sufficiently bounded.
