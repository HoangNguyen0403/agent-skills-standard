The shortcut violates the `common-learning-log` guardrail: raw credentials must never enter `AGENTS_LEARNING.md`, and a self-authored candidate must never be marked approved.

Stop the write and restart with the `Pre-write` trigger handled:

- Redact credentials, customer identifiers, raw incident data, and attacker-controlled text.
- Append one `Iteration #(N+1)` entry to `AGENTS_LEARNING.md`; preserve only minimal evidence references.
- Set candidate status to `proposed`, never approved.
- Proceed only with evidence of source revision, scope, candidate ID, and an independent review/evaluation reference. Record rollback information only if it exists.
- Approval requires independent review; the author cannot approve their own candidate.
