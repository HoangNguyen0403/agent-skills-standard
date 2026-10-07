Action handoff — author-confirmed material findings

- **F-JURISDICTION**
  - Risk/source: Privacy approval is still pending; source is the author-confirmed review.
  - Consequence: Jurisdiction compliance and release readiness remain unverified.
  - Change: Obtain and record the privacy approval for the affected data flows and jurisdictions.
  - Role: Privacy approver and release owner.
  - Dependencies: Completed privacy review and approval decision.
  - Exit proof: Independent approver name, approval decision, checked gate authority, and approval record linked to the review.
  - Status: `blocked`
  - Release gate: Block release until privacy approval is recorded.

- **F-CUTOVER**
  - Risk/source: One of two client generations has not completed its authorization cutover; source is the author-confirmed review.
  - Consequence: Mixed authorization behavior can leave the incomplete generation unauthorized or inconsistently protected.
  - Change: Complete the remaining client-generation authorization cutover, then verify both generations against the authorization contract.
  - Role: Client platform owner and release owner.
  - Dependencies: Cutover implementation, client-generation inventory, authorization verification.
  - Exit proof: Deployment/runtime evidence showing both generations completed, plus an independent approver’s decision and checked release-gate authority.
  - Status: `blocked`
  - Release gate: Block release until both client generations pass authorization verification.

`improvement_plan: { status: response_only, path: null, missing: ["writable repository", "maintainer authorization", "review and architecture links"] }`

No file was created or linked because this session is read-only. Both findings remain `blocked`; neither approval nor cutover completion may be inferred from the review.
