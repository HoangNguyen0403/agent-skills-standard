[MAJOR] [PR diff] Seniority and green CI are not evidence that the change is safe to approve.
Why: Tests do not replace review of security, logic, architecture, efficiency, edge cases, and requirements, and no diff evidence was provided here.
Fix: Inspect the diff and tests first; report evidence-backed findings using `[BLOCKER]`, `[MAJOR]`, or `[NIT]` before giving any approval recommendation.

