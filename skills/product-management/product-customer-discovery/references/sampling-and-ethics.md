# Sampling, Ethics, and Privacy in Customer Discovery

This reference sets forth mandatory ethical, sampling, and data privacy requirements for conducting customer discovery within the product-evidence framework.

## 1. Ethical Sampling & Recruitment Boundaries

Customer discovery findings are only as sound as the cohort from which they are drawn:
- **Avoiding Friendly / Churn-Resistant Bias**: Do not interview only advocates, early adopters, or friendly references who rarely push the system to failure.
- **Role Alignment**: Interview the actual practitioner performing the workflow (end users), not merely executive sponsors or buyers whose perceptions of daily operational friction are detached from reality.
- **Inclusion / Exclusion Criteria**: Document explicit criteria for participant selection (e.g., "Must have conducted at least 5 vendor evaluations in the past 12 months; exclude current advisory board members").
- **Confounder Tracking**: Note potential confounders (e.g., participant's company is undergoing a major merger, or they are testing beta software).

## 2. Qualitative Sample Limits: Frequency vs. Population

A qualitative study of 5–15 participants cannot yield statistical distributions:
- **Forbidden Practice**: Converting qualitative interview frequencies into market percentages (e.g., claiming "80% of enterprise customers demand Feature X" because 4 out of 5 interviewed users mentioned it).
- **Required Practice**: Frame findings as qualitative signals, observed friction patterns, and candidate problem statements. If quantitative prevalence is required, route the hypothesis to a formal quantitative survey or instrumented experiment (`EXP`).
- **Counterevidence Mandate**: Document every participant who did *not* experience the problem, or who expressed satisfaction with existing workarounds.

## 3. Informed Consent & Data Minimization (Contract §2.3)

Respect participants and apply the applicable consent/privacy review standards; this method does not assess or certify legal compliance.
- **Informed Consent**: Participants must be informed in advance of:
  - The purpose of the research.
  - How interview data and recordings will be stored and used.
  - Their right to pause, skip questions, or terminate the interview at any time.
  - Their right to request redaction or deletion of their transcript.
- **Privacy Classification Invariants (Contract §2.3)**:
  - **Restricted Data**: If a transcript contains sensitive participant data or proprietary secrets, set `privacy.classification: "restricted"`. Restricted data **must** use `privacy.redaction: "pointer_only"` and `privacy.access: "protected"` or `"unavailable"`. The combination of `restricted` with `redacted` or `available` is **strictly forbidden**.
  - **Internal Data**: De-identified transcripts with PII scrubbed set `privacy.classification: "internal"`, `privacy.redaction: "redacted"`, and `privacy.access: "available"`.
  - **Confirmed Support Rule**: A claim (`CLM`) can achieve `classification: "confirmed"` **only if at least one supporting source has `access: "available"`**. If all cited sources are `protected` or `unavailable`, the dependent claim must be classified as `inference` or `assumption` with explicit limitations; protected data cannot become confirmed support by self-labeling.

## 4. The "No Customer Access" Protocol

When an engineering or product team does not have access to real customers:
- **STRICT PROHIBITION**: Never use an LLM to simulate customer interviews, generate fake persona transcripts, or invent customer quotes (e.g. no "Participant A said...", no fabricated interview dates). Synthetic customer interviews portrayed as empirical evidence constitute fabricated research.
- **Required Action**:
  1. Record an explicit research gap in the project ledger (`docs/product/<slug>/evidence.json`).
  2. Produce a **Proposal-Only Customer Discovery Plan** with **strictly blank templates**:
     - Target persona profile criteria and recruitment screener.
     - Neutral, non-leading interview guide and observation checklist (blank questions and prompt structures only).
     - Specific hypotheses to validate once customer access is established.
  3. Mark all dependent opportunity records as `status: "candidate"` with explicit unresolved uncertainties.
