# Independent T4 review

## Verdicts

- **Spec compliance: APPROVE.** No material defect found against T4-1 through T4-4 or frozen SRS §4.1 / §7 T4 ownership and walkthrough requirements.
- **Guidance quality: APPROVE WITH CONCERNS.** No blocking guidance defect found. The serialized example is shape-compatible, but its illustrative oracle reference must not be represented as validated evidence; see C1.

These are independent static-review verdicts, not human approval, runtime verification, release approval, or evidence of improved model behavior.

## Scope and provenance

- Authorized personal AGS scope; independent reviewer, not T4 implementation owner.
- Reviewed immutable `.agent/sdd/ai-test-assurance/T4-guidance-review.md`, captured 2026-10-26T16:44:40.844Z, base `92d06c420f6a41f08e11579423e4e3eacdb7880d`.
- Requirements: `.agent/sdd/ai-test-assurance/T4-v2-brief.md`, and `docs/srs/srs-ai-test-assurance.md` §4 / §7. Implementer report: `.agent/sdd/ai-test-assurance/task-4-report.md`.
- Trust classification: semi-trusted local review inputs. Implementer claims are supporting context, not independent execution evidence. Offline document analysis only; no claim of host-enforced sandboxing.
- All diff anchors below refer to lines in the immutable review snapshot, not moving source line numbers.
- Only this report was written. No implementation edits, delegation, shell commands, builds, lint, tests, formatters, commits, premium calls, or unrelated T2/T6 inspection.

## Findings

**No BLOCKER or MAJOR findings.**

### C1 — Nonblocking example-provenance concern

**Anchor:** `T4-guidance-review.md:98-124`, especially lines 113-116; canonical target `skills/common/common-tdd/references/quality-contract.md`, “Serialized Contract (JSON)”.

**Why:** The JSON uses a concrete-looking `docs/specs/cli.md` reference and SHA-256 `e3b0c442…b855` (the empty-content digest), while its rationale describes a substantive specification table. That is not demonstrated oracle evidence. The surrounding heading only says the example matches the Intent schema; it does not explicitly claim an actual bundle validated, so this is not a schema violation or a blocking false-verification claim. However, copying it unchanged would not supply an evidenced independent oracle. The later no-fabricated-oracles rule at snapshot lines 128-130 correctly forbids that outcome.

**Fix:** Explicitly label the JSON as a shape-only illustration whose reference, digest, command, and rationale must be replaced with actual independently reviewed artifact data before use; alternatively bind it to a real example artifact and its actual digest. Do not call this example a validated declared bundle without separate evidence.

**Confidence:** High for the documentation distinction; no assertion that the referenced path exists or does not exist, because repository artifact resolution was not performed.

## Acceptance and scenario walkthrough

| Requirement / scenario | Review result and immutable evidence |
| --- | --- |
| T4-1 / existing intent extended | Preserves `contract`, `fault`, `layer`, `cases`, `command`; adds `id`, `requirements`, `owner`, `oracle`, `boundaries` to the same record. Snapshot lines 33-51, 78-96. No competing checklist/status system. |
| Independent oracle | Implementation-copied expected output is rejected explicitly; oracle basis, owner, rationale and content reference are required. Snapshot lines 47, 92, 128-130. A report that merely names an independent oracle while deriving expected values solely from implementation remains unacceptable. |
| Honest real/mock boundaries | Explicit real/mocked arrays and justification, plus prohibition on mocking away the tested boundary. Snapshot lines 48, 93, 135. Real serialization plus mocked unrelated external I/O remains justified when the declared fault is observable. |
| T4-2 / risk-sensitive evidence | Plausible distinct faults are required; blanket mutation quotas and arbitrary test counts are rejected. Snapshot lines 43, 60, 134, 147. No universal numeric target added. |
| Justified cross-layer coverage | Unit domain checks and integration wire-format checks survive together when they catch distinct risks; static duplication alone does not authorize deletion. Snapshot lines 31, 135, 139-142. |
| T4-3 / fixture weakening | An unchanged assertion plus empty/generic seeds cannot qualify as HEALED. State-precondition weakening is explicitly forbidden, not merely assertion-text edits. Snapshot lines 160, 183, 197-204. |
| T4-3 / selector weakening | A selector that matches an unintended DOM element is forbidden even after three green reruns. Snapshot lines 18, 160, 184, 198-200. This does not prohibit a legitimate locator repair preserving the intended target. |
| Real bug and quarantine paths | Product behavior changes/exposed defects route to `dev-fix`; intermittent isolated failures route to flaky-triage with ticket/expiry and continued reporting. No skip/fixme healing or green-by-retry authorized. Snapshot lines 18, 160-171, 201-206. |
| T4-4 / owned paths | The immutable package contains only the six owned canonical guidance paths. Report supplies concrete good/bad scenarios at `task-4-report.md:26-51`. This does not independently prove absence of unrelated worktree changes; those were intentionally not inspected. |

## Machine Intent compatibility

Manual field-by-field comparison with SRS §4.1 (`docs/srs/srs-ai-test-assurance.md:118-132`):

- All required top-level fields appear, with no extra field in the JSON example.
- `requirements` and `cases` are nonempty arrays; scalar identity/contract/fault/command fields are nonempty strings.
- `layer: unit` is one of the four frozen enum values. The prior human `component` wording is not reintroduced as an unsupported serialized enum.
- `oracle.ref` has `path` and a 64-character lowercase hexadecimal digest; `basis: external_specification` is permitted; owner/rationale are present.
- `boundaries` has string arrays `real` / `mocked` and a nonempty justification; an empty mocked array is appropriate for the described pure boundary.
- Therefore the example is **shape-compatible by inspection**, not verified artifact-compatible or executable. C1 distinguishes those claims.

## Trust and verification limits

Snapshot lines 51 and 126-130 correctly limit receipts to local consistency under `local-untrusted`; hashes do not prove execution authenticity, oracle independence, or trustworthy authorship. Human semantic review remains necessary. No new enforcement or production-quality claim appears in the diff.

The implementation report's walkthroughs are reasoning examples, not observed scorer/model execution. Its command and worktree-cleanliness claims were not re-executed or independently certified. T6 executable scorer controls and later integrated verification remain outside this review; their absence is not a T4 defect because SRS §7 assigns this gate a manual independent walkthrough.

Security, efficiency and clean-code lenses: no changed executable surface, dependency, credential handling, or allocation path in this package. Relevant risk is misleading evidence/guidance, addressed above. No general security assurance is inferred.

## Skills and audit

Loaded through project MCP: `common-code-review`, `common-feedback-reporter`, `common-llm-security`, `common-owasp`, `common-security-audit`, `common-session-retrospective`, `common-skill-creator`, `common-subagent-driven-development`, `common-tdd`, `common-workflow-writing`; workflow `code-review`. Also read runtime skills `code-review`, `writing-skills`, and `using-superpowers` (the latter defers for dispatched workers). The session compliance audit confirmed the ten project skills. Its broad Markdown/product-management coverage warning does not identify a matched missing product skill for this bounded guidance review.

Cost: unavailable; host token usage and pricing were not supplied. MCP telemetry is not a complete session-cost measurement.

## Handoff

T4 can proceed to integration on this review. C1 is a nonblocking clarification, not a new validator/schema requirement. Keep T6/T8 execution and final integrated acceptance evidence separate; do not promote these static-review verdicts into runtime PASS or human approval.
