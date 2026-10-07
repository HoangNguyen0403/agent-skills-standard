## Review handoff

Status: **Not ready for approval or architecture entry update.** The proposed proxy and recovery design remain unverified.

| Finding | Required action | Closure evidence |
|---|---|---|
| **F-CLINICAL** | Demonstrate that the proxy actually protects sensitive clinical-record access in the deployed architecture. | Runtime and deployment evidence: request path, authorization enforcement, identity propagation, deny behavior, relevant configuration, and deployed-version linkage. |
| **F-JURISDICTION** | Resolve the applicable jurisdiction/privacy decision and identify its approver. | Recorded decision naming the jurisdiction/privacy basis, approver role or identity, decision date/version, and resulting constraints. |
| **F-CUTOVER** | Account for authorization behavior in client generations **A** and **B**, then verify both have transitioned to the intended path. | Versioned rollout plan, traffic/client-generation evidence, authorization-path telemetry or logs, and rollback status for both generations. |
| **F-RESTORE** | Perform and document a recovery restore drill. | Drill record covering backup used, restored environment, integrity/access validation, measured RTO/RPO, defects, remediation, and reviewer sign-off. |

### Action plan

1. Assign accountable owners by role; no individual approvals or completed controls are assumed.
2. Collect the four evidence packages above and link each to its finding in `architecture/reviews/review-clinical-access.md`.
3. Keep the architecture decision/entry in `architecture/README.md` marked pending or conditional until all findings are closed.
4. Re-review the architecture entry after evidence is attached and the jurisdiction/privacy decision is formally approved.

Assumptions: the supplied findings and maintainer authorization are verified; no additional clinical, personal, runtime, deployment, approval, or restore-drill facts are inferred. No file writes are claimed.
