# ADR-CT-01: Bounded Evaluation and Trace Compatibility

Status: accepted for technical design by requesting maintainer, 2026-11-05; implementation not authorized
Date: 2026-11-05
Owner: requesting maintainer; Engineering owns implementation after separate authorization
Source: approved `docs/prd/prd-critical-thinking-agent-workflows.md`
Scope: decision/evidence fidelity only

## Decision

1. Reuse the existing `regex` assertion API for selected finite decision-field evals; do not create a new scorer type, general semantic judge, model dependency or scoring-semantics version.
2. Keep independently reviewed semantic adjudication separate from deterministic pass rates. Selected authority controls accept no ungraded prose; existing unrelated cases with optional NOTES retain their original contract and limitation.
3. Preserve approved IDs by extending formal grammar with an uppercase namespace and **exactly two** terminal digits. Existing numeric formal suffixes remain at least three digits; existing namespaced historical source suffixes remain at least three digits. These sets stay disjoint.
4. Apply that grammar consistently to outcome and trace classification, and give historical-source context validation precedence over canonical declaration acceptance. Preserve malformed mapping candidates so diagnostics are not silently suppressed.

## Evidence

- `scripts/evals/scorer.ts:172-211,243-267`: regex uses `new RegExp(value, "i")`; invalid patterns fail; every assertion must pass. Suspicious-answer flags do not supply semantic adjudication.
- `skills/common/common-tdd/evals/evals.json:38-46`: existing whole-answer shape plus per-field decision assertions.
- `scripts/evals/diagnostic-prevention.test.ts:18-49`: NOTES is ungraded; finite calibration does not imply semantic safety or model efficacy.
- `scripts/outcome/schema.ts:105-110` and `scripts/trace/types.ts:6-32`: independent numeric-only formal definitions plus a distinct historical source grammar.
- `scripts/trace/parse.ts:198-209,238-272,334-342`: source-context detection and declaration classification require more care than widening the regexes alone.

These are documented code contracts, not observed production/model behavior.

## Alternatives Rejected

- **Keyword-only assertions:** already shown to admit refusal-plus-violation; do not judge the consequential action.
- **A universal semantic scorer or second-model judge:** expands scope, cost and authority; model agreement does not establish truth or independent review.
- **Ungraded explanation in new authority controls:** a safe decision field could conceal a contradictory instruction. No free-text region is needed for the finite decision test; substantive prose belongs in the semantic lane.
- **Rename approved IDs or empty receipt traces:** destroys identity/completeness to satisfy reporting rather than fixing compatibility.
- **Namespaced formal suffix of two or more digits:** overlaps historical IDs such as `REQ-DISC-001`; could change source-only documents into formally sufficient scope.
- **Change only outcome schema:** trace consumers still reject/misclassify the approved IDs.
- **Change only the two grammar definitions:** source-only tables could falsely populate canonical declarations. Source-context validity must also be corrected.
- **Filter malformed mappings out:** removes the very evidence used to diagnose malformed source IDs; retain and reject them instead.

## Compatibility And Ownership

The SRS is the sole owner of the precise grammar, field contracts, source-header boundary, parser precedence, tests and verification mappings. This ADR records the choice and trade-off rather than duplicating those definitions.

No persisted historical run/transcript/input is rewritten. Existing formal numeric IDs, source mappings and historical source-only required-scope failures retain their meaning. No aliases or case normalization are added. A namespace has 100 two-digit ordinal spellings, including 00; no need for a larger range is established by this 12-criterion initiative. Requiring longer formal namespaced ordinals is a reason to revisit the classification model, not silently broaden a regex.

`ID_GRAMMAR` remains the canonical pure grammar source in `scripts/trace/types.ts`; outcome validation references it instead of maintaining a conflicting second definition. Dependency direction is outcome validation → pure trace types, with no reverse outcome import or cycle. Parser context still determines whether a syntactically canonical token is valid in that occurrence.

## Consequences And Reversal

- Cheap offline controls become stronger only inside a declared finite envelope. Ordinary workflow answers are not forced into machine fields.
- False rejection of valid prose is handled by independent semantic review, not increasingly permissive regexes pretending to understand language.
- Reporting compatibility requires bounded code/test changes and explicit design/implementation approval. It is not implemented by this document.
- Trace/schema validation remains a consistency check, not execution, provenance, human approval or completeness proof.
- Before publication, a candidate can be abandoned as an owned patch without editing historical evidence. After consumers adopt the new grammar, removing support requires a reviewed migration; no automatic rollback is authorized.

## Reconsider When

A concrete approved requirement needs longer namespaced formal ordinals, a new source-header meaning, machine-graded free-text semantics, or changes to assertion results/versioning. Each changes the contract and needs new evidence, impact analysis and scoped approval. No cache, queue, network service, telemetry store or additional model is justified by this decision.
