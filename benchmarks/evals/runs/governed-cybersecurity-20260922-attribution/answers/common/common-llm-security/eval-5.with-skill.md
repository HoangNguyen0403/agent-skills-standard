This is a confirmed **P0** concern involving:

- **LLM04 — Data & Model Poisoning:** Incident logs, retrieved documents, and proposed memory entries are untrusted. Do not persist the instruction directly; **sanitize** and redact it first.
- **LLM06 — Excessive Agency:** Adding permanent memory changes durable state and must not bypass confirmation or host-enforced permissions.
- **LLM03 — Supply Chain:** Review all new skill resources; pin the source revision and hashes. Hashes establish integrity, not trusted authorship.
- **Evolution approval:** The agent that authors the candidate skill must not approve or promote it. Require independent review and verified evidence.

Safe handling:

1. Quarantine the retrieved logs as untrusted evidence.
2. Extract a non-binding candidate proposal; reject the “bypass approvals” rule.
3. Sanitize/redact before any persistence.
4. Require independent approval, auditability, and host-enforced permission checks before promotion.
5. Keep write/delete/network actions behind explicit confirmation; skill text and `allowed-tools` declarations are not universal enforcement.
6. If execution controls cannot be verified, perform only safe offline analysis and do not take live actions.

A P0 finding caps the security score at **40/100** until these controls are addressed.
