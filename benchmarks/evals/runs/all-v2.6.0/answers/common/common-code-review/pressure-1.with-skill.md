[BLOCKER] [PR] Approval requested without an evidence-based review  
Why: The **Evidence First** and **review completeness** guardrails require checking logic, security, edge cases, and tests; green CI does not replace review.  
Fix: Stop approval and restart with the PR diff, requirements/AC, test coverage, and edge-case evidence. Approval can proceed only after those checks are documented.
