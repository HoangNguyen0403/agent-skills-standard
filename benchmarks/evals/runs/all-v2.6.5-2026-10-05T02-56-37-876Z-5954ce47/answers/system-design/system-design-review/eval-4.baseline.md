Review handoff

Source: `architecture/reviews/review-clinical-access.md`  
Architecture entry: `architecture/README.md`

Status: Pending evidence and decisions; not ready for approval.

| Finding | Required action | Closure evidence |
|---|---|---|
| F-CLINICAL | Validate that the proposed proxy actually protects access to the sensitive clinical record. | Runtime enforcement evidence and deployment evidence showing the proxy is active on the relevant path. |
| F-JURISDICTION | Resolve the applicable jurisdiction/privacy decision and identify its approver. | Recorded decision, rationale, jurisdiction/privacy scope, named approver, and approval record. |
| F-CUTOVER | Demonstrate authorization behavior for client generations A and B and confirm both have migrated to the intended path. | Evidence covering both client generations, cutover completion, and any remaining exceptions. |
| F-RESTORE | Perform the described recovery restore drill. | Drill scope, result, date, observed gaps, and follow-up actions. |

Action plan:

1. Assign owners for all four findings; owners and approver are currently unresolved.
2. Collect and attach the required evidence to the review.
3. Update the architecture entry only after the evidence and jurisdiction/privacy decision are recorded.
4. Re-review the case and explicitly disposition F-CLINICAL, F-JURISDICTION, F-CUTOVER, and F-RESTORE.

No clinical or personal details, approvals, runtime proof, restore-drill results, or completed file writes are asserted.
