---
name: product-customer-discovery
description: 'Guide ethical customer discovery and research synthesis, distinguishing direct observations from inferences, preventing leading interview questions, and tracking quote-to-insight provenance. (triggers: `product customer discovery`, `product research synthesis`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - product customer discovery
      - product research synthesis
---

# Product Customer Discovery

## **Priority: P0 (CRITICAL)**

Capture rigorous, non-leading customer evidence anchored in observable behavior and informed consent, without fabricating interviews, leading subjects, or misrepresenting small samples.

## 1. Capability Preflight

Verify `product-evidence` capability before validating or committing changes to `docs/product/<slug>/evidence.json`:
1. **Skill Resolution**: Load through MCP (`get_skill("product-management", "product-evidence")`) or resolve installed root paths `<root>/product-management/product-evidence/SKILL.md`, `<root>/product-evidence/SKILL.md`, or flattened Kiro `<root>/product-management-product-evidence/SKILL.md`. A missing/excluded skill is a capability gap; never infer installation from source checkout.
2. **Companion Resource**: Resolve `scripts/validate-product-evidence.mjs` relative to the loaded package directory (ordinary `<root>/product-management/product-evidence/`; flattened `<root>/product-management-product-evidence/`). Missing companion is a separate resource gap.
3. **Runtime**: Check Node.js >=20 separately. Missing runtime is not a missing skill/resource.
4. **Offline Mode**: If any prerequisite is absent, safe research/proposal work may proceed only as `unvalidated`; no simulated validation, readiness claim, or silent sync/install.

## 2. Core Protocol

1. **Discovery Scoping & JTBD Framing**:
   - Frame research around customer jobs-to-be-done (JTBD) and current friction points.
   - Establish explicit cohort definitions, inclusion/exclusion criteria, and target observation window `(start, end)`.
2. **Ethical Sampling & Consent Boundaries**:
   - Obtain and record explicit informed consent for all participant sessions.
   - Mandate privacy redaction: never store raw PII, customer credentials, or non-redacted participant identities.
   - **No Access Rule**: If real customer access is unavailable, report an explicit research gap. Output proposal-only interview guides or recruitment plans; never generate synthetic interviews or pretend AI simulation is customer evidence.
3. **Non-Leading Inquiry & Observation**:
   - Focus questions on past behavior, actual spending, and concrete friction ("When was the last time you...?", "Show me how you currently...").
   - Ban leading or speculative prompts ("Would you buy X if we built it?", "Do you love this concept?").
   - Record observable actions, system logs, and direct quotes separately from observer interpretations.
4. **Observation vs. Inference Tagging**:
   - Label direct quotes and observed actions as `confirmed` facts only when backed by an available, de-identified transcript `SRC`. If transcript access is protected/unavailable, dependent claims are `inference` with documented rationale.
   - Label user needs, motivations, and summaries as `inference` with documented rationale.
   - Separate sample frequency (e.g. "4 of 5 participants") from market percentage; small qualitative cohorts never prove population distribution.
5. **Quote-to-Insight Ledger Output**:
   - Emit valid `SRC`, `CLM`, and candidate `OPP` records conforming to `docs/product/<slug>/evidence.json`. All training ledgers must be explicitly marked `synthetic: true`.

## 3. Anti-Patterns & Red Flags

- **No Synthetic Customers**: Never invent personas, quotes, or transcripts as actual customer evidence.
- **No Leading Prompts**: Never pitch features during discovery interviews.
- **No Small-Sample Generalization**: Never convert "3 out of 4 interviewed users" into "75% of the market wants X".
- **Stop if Consent Missing**: If session lacked consent or recording rights, discard data from ledger intake.

## 4. References

- [Discovery Protocol](references/discovery-protocol.md) — Non-leading interview techniques and JTBD inquiry.
- [Sampling and Ethics](references/sampling-and-ethics.md) — Participant recruitment, consent, and PII protection.
- [Evidence Mapping](references/evidence-mapping.md) — Schema mapping to `SRC`, `CLM`, and candidate `OPP` records.
- [Citations and Sources](references/citations-and-sources.md) — Conceptual citations and independent authorship statement.
- [Semantic Rubrics](references/semantic-rubrics.md) — Outcome-based grading rubrics and false-pass rejection criteria.
- [Synthetic Example Ledger](references/examples/synthetic-customer-ledger.json) — Complete valid standalone synthetic ledger.
