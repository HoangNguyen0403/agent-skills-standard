# Evidence Mapping for Product Customer Discovery

> **Synthetic-only example.** The linked complete ledger and source bytes are training inputs, not participants, interview transcripts, real observations, or consent. Blank proposal templates contain no fictional person, quote, or result.

## Canonical ledger and evidence boundary

Use one `docs/product/<slug>/evidence.json`. A readable `research.md` view cites exact `SRC`/`CLM`/`OPP` IDs and revisions, authority/access, scope, sample limits, counterevidence, and unknowns; it is not a second editable ledger. Product state remains separate from Outcome delivery status and trace IDs.

Keep the source's original cohort/window in `SRC.data.origin.scope`. `confirmed` may describe only a literal visible quote or action from an available, de-identified source and that source's exact session/cohort. Motives, causal explanations, recurring need, multi-session impact, population prevalence, or market demand are interpretations and require inference/assumption/unknown classification, rationale, and limits. Preserve negative observations.

## Record mapping

- `SRC`: exact local source path and SHA256 for supplied fictional bytes; origin/revision/time/scope; retrieval instant; privacy, license, access, availability, and limitations. Restricted material is `pointer_only` with protected/unavailable access; no protected/unavailable material supports a confirmed claim.
- `CLM`: literal statement or clearly marked interpretation; exact supporting `SRC` refs in both `sources` and `depends_on`; exact negative refs in `counterevidence`; rationale, uncertainty, and supported/unresolved/refuted/disputed status. Frequency in a small qualitative cohort is not population prevalence.
- `OPP`: candidate problem/job only when evidence supports it; link exact claim pairs, alternatives/substitutes (including `unknown`), sample limitations, and unresolved need. No customer access means a gap plus a proposal, not simulated research.

The complete fictional source fixture records one displayed action only. It does not assert an interview, consent, actual customer, repeated behavior, cause, or product need. Hashes prove byte identity only—not source truth, permission, or consent.

## Strategy handoff and reassessment

### Worked fictional discovery-to-strategy handoff (read-only)

Canonical ledger identity: `docs/product/synthetic-customer-discovery/evidence.json`; slug `synthetic-customer-discovery`, revision `r1`, exact Scope `{segment:"Mid-market B2B SaaS Operations", geography:"North America", window:{start:"2026-09-01T00:00:00Z", end:"2026-10-10T23:59:59Z"}}`. The complete read-only fixture payload for this identity is [`examples/synthetic-customer-ledger.json`](examples/synthetic-customer-ledger.json); it is one ledger, not a second editable view.

Handoff within that same ledger: retain `SRC-001/r1` (one literal fictional action: an example operator copies one report value from a spreadsheet into a second form); `CLM-001/r1` supports only that action; and `OPP-001/r1` keeps recurrence, cause, customer job, substitutes, demand, duration, time savings, and need unknown. `HYP-001/r1` depends on exact `OPP-001/r1` and `CLM-001/r1`, has the same Scope, null primary metric, proposed status, and a conditional prediction/disconfirmation about repeated copying plus participant-described friction in future appropriately consented research. Neither is asserted now; no API cause, person, interview, consent, quote, frequency, or outcome is fabricated. `DEC-001/r1` depends on and consumes exact `OPP-001/r1` and `HYP-001/r1`, includes `CLM-001/r1` in both `critical_claims` and `depends_on`, and is `purpose:learning`, `status:proposed`, `outcome:defer`; authority and strategy binding are null. The root strategy gap remains explicit; product state remains `unvalidated`, lists `HYP-001/r1`, and has `decision:null`. This is a no-action recommendation: it authorizes no customer contact, recruitment, research, spend, build, or product action. Separate authority, appropriate consent, and new scoped evidence are prerequisites; these exact pairs resolve only within this slug, not by reusing ID tokens across ledgers.

For scope changes, create a newly reviewed claim. For affected-only reassessment, use `product-evidence` §2.6's complete per-kind, role-aware bounded influence worklist, including counterevidence and typed measurement/authority/artifact support where applicable. Keep pair resolution, acyclic provenance `depends_on`, influence, and DEC succession separate; do not drop negative evidence, retarget approvals, invalidate unrelated decisions, or infer delivery state.
