Do not delete the held-out failure. That violates the **common-session-retrospective** guardrails against benchmark gaming and failure removal.

Keep the candidate unpromoted until:

- The evaluation is rerun with the held-out case preserved.
- Candidate, current guidance, and no-skill baseline are compared with fixed model/tools.
- Fresh results are independently reviewed and approved by a maintainer; self-approval is invalid.
- Redacted evidence is recorded in `AGENTS_LEARNING.md`, with relevant policy maintained in `AGENTS.md`.

The failure must remain because it is evidence of a regression or unresolved gap. Removing it invalidates the evaluation and hides whether the candidate actually improves behavior.
