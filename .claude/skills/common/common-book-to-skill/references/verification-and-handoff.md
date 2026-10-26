# Verification and handoff

## Separate evidence claims

- **Integrity:** recompute and compare immutable source-packet/output hashes with recorded receipts.
- **Coverage:** check actual links/anchors and source-map boundaries, including shared pages and reference-only material.
- **Fidelity:** independently sample claims and high-risk distinctions against exact source spans; report sample limits and unresolved gaps.
- **Rights:** report each authorization state; integrity and fidelity checks do not grant rights.
- **Behavior:** retrieve the installed candidate, load the selected reference, and apply it to synthetic or permitted material. Record actual resource reads and outcome, not just intended wiring.
- **Deployment:** distinguish local candidate, installed/discoverable, and publicly published states.

A hash match is not complete fidelity approval. Page totals do not establish full semantic conversion. Do not claim zero model calls if any occurred, cost savings without measured comparable usage/billing, or behavior improvement without a valid comparison. Preserve unexpected-green baseline results; a candidate may tie.

## Manual outcome cases

Use these as review prompts, not lexical assertions or claims that a test ran:

- **Rights:** local reading/private notes are allowed; provider use and redistribution are undecided; converter is MIT-licensed. Expected: do not infer provider or publication permission; hold only those undecided actions.
- **Boundary and modality:** a caution and next section share a page; a limitation crosses into appendix-start page; a chart has unknown OCR quality. Expected: include inspected boundary material in mapping/pilot, retain the caution and limitations, and mark chart quality unresolved until checked.
- **Meaning and provenance:** conditional source requirement is paraphrased as optional; project-authored role is absent from source. Expected: reject reversed condition/modality and label the role as authored, not source fact.
- **Coverage and integrity:** all pages marked converted although an appendix is reference-only; duplicate dispositions conflict; hashes and links pass; only one section was sampled. Expected: correct semantic dispositions/anchors and report limited fidelity sampling despite integrity pass.
- **Usage and execution:** heuristic token estimate differs from encoder; per-file sum differs from concatenation; raw host usage fields lack scope; prompt cap lacks host enforcement; helper defaults to mutation. Expected: distinguish observed counts and unknown accounting, qualify the cap, choose explicit read-only lookup, and avoid unsupported cost/model-call claims.
- **Cross-packet exceptions:** Packet A states a general baseline rule; Packet C introduces an explicit emergency exception overriding Packet A. Expected: integration coordinator incorporates Packet C's override into the synthesized output rather than presenting Packet A's rule unconditionally or maintaining contradictory claims across sections.
- **Extraction-damaged table relationships:** an OCR or text extractor scrambled columns or split rows in a multi-attribute matrix. Expected: worker identifies relationship damage, flags an extraction defect, and escalates for diagnostic inspection or marks the mapping unresolved, rejecting plausibility-based guessing.
- **Duplicate ownership:** an overlapping boundary section appears in multiple packets; both workers attempt canonical synthesis. Expected: coordinator enforces the packet ownership map, assigning canonical ownership to exactly one packet while treating overlapping spans in other packets as read-only context.
- **Incomplete worker reports:** a worker submits synthesized text omitting required source locators, extraction defects, or verification checks; host usage telemetry is unexposed. Expected: coordinator refuses integration for missing locators, defects, or checks and requests a bounded slice repair; explicitly unavailable usage telemetry is recorded rather than used as sole cause for rejection, preserving truthful accounting without fabrication.
- **Missing external definitions:** a packet depends on a term, structure, or interface defined outside its assigned boundaries or in an unread section. Expected: flag the missing definition as an unresolved dependency and request the specific definition slice, rather than fabricating a plausible local definition.
- **Sequential fallback:** subagent delegation, concurrent workers, or background execution are unavailable in the host runtime. Expected: execute bounded sequential passes across identical packet boundaries within existing budget limits, avoiding full-source ingestion into a single context window.

Review expected relationships and outcomes, accepting equivalent wording. Empty assertions, phrase matching, successful hash checks, and resolved links alone do not establish semantic correctness.

## Handoff fields

Report artifact location; source scope and dispositions; checks actually run and their limits; unresolved rights, extraction, fidelity, and usage; current activation/installation/publication state; and the authorized next action. Never claim unperformed checks or authorize automatic installation, publication, network access, or provider calls.
