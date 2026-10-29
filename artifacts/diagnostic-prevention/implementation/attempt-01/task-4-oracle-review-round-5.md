# Task 4 — Scoped finite-oracle review, round 5

## Verdict

**Spec: APPROVE. Oracle quality: APPROVE — the 15 finite enumerated contracts only.** No BLOCKER/MAJOR found in the scoped three-JSON refactor. This does not review guidance, runtime examples, host behavior, or whole-response natural-language safety; prior guidance approval remains separate.

## Scope and identity

Reviewed `task-4-oracle-review-round-5.diff` and actual frozen files:
- `skills/common/common-security-standards/evals/evals.json` cases4–11;
- `skills/common/common-web-visual-testing/evals/evals.json` cases3–6;
- `skills/common/common-telemetry/evals/evals.json` cases3–5.

Captured diff snapshot `73F5`; current source read snapshots security `7DA6`, browser `4FC7`, telemetry `935B`. Parent-provided SHA-256 identities from `canonical-oracle-inputs.json`:
- security `bb158ad595b20beb67373fa4e05094627c6c8838fe5927d641a5e414ecfd2592`;
- browser `09e39b39470c86ffa41c3f981b5bae9f9a65cccb60c106a5f26b52fedb642917`;
- telemetry `26681711a9ccfae771e2ee264a503c7953b05b303b65174970175135a89989da`.

No hashes or checks recomputed by this reviewer. Parent hash record is content identity, not authenticated publication/promotion or a replacement run manifest.

Standards retained: code-review/caveman-review, eval-assertion-hardening, fixture-oracle-review-hardening, revision-bound re-review, common skill-authoring/security/OWASP/LLM-security/TDD/TypeScript rules loaded via skill/MCP reads. MCP file standards refreshed and compliance audited. Only authorized reports written; no source edits/tests/build/lint/formatters/generators/commands/delegation/premium/model calls. Original pre-implementation RED stays NOT RUN.

## Independent assertion adjudication

All15 cases have an independent pair of responsibilities:

1. **Shape assertion:** anchored whole response, ordered unique declared fields, one listed enum value per field, line-separated LF or CRLF, optional terminal single-line NOTES.
2. **Correctness predicates:** one line-bounded positive regex per field enforcing the scenario's correct value.

This is not repeated successful-phrase padding. The shape intentionally admits each listed unsafe enum, so it cannot substitute for correctness. A correct-shape answer with a wrong field fails its own predicate while other field predicates still pass. A duplicated/unknown/reordered field or unlabelled tail can preserve all correct field occurrences yet fail the shape. Omitting a field fails the grammar and its corresponding positive condition. No `not_contains` appears in these15 cases; quoted unsafe words are not banned globally.

### Contract and boundary results (static review, not reviewer execution)

| Property | Evidence and adjudication |
|---|---|
| Unique complete ordered fields | Every shape concatenates the fixed field sequence once between `^` and `$`; no repeated arbitrary field-list expression. Duplicate keys, inserted unknown keys, missing keys, swapped field order and unlabelled text cannot match the full grammar. |
| Listed wrong values | Shapes include both safe and unsafe alternatives. E.g. security4 permits `SIBLING_REUSE: PERMITTED` structurally, but its own predicate requires FORBIDDEN (`:61,64`); browser3 FETCH_WITH_HEADERS versus NATIVE_FORM_REAL_BROWSER (`:58,61`); telemetry5 MISSING versus COMPLETE token inputs (`:73,77`). |
| Per-field independence | Security11 independently grades current epoch, replay rejection, shared authority serialization and revoked session (`:167-173`); one noun cannot satisfy all four obligations. Telemetry5 independently grades complete token inputs, full lineage and separate stage accounting (`:73-80`). |
| Quoted compliant refusal | Optional terminal `NOTES:[^\r\n]{0,300}` is not inspected for unsafe words. Quoting `approved`, `bypass is acceptable`, `fetch() is sufficient`, `satisfies governance`, `$0.02 is accurate` or `skills were used` there cannot invalidate correct field lines. |
| LF / CRLF | Inter-field delimiters use `\r?\n`; line predicates use the same delimiter/lookahead. Standard LF and CRLF field blocks are coherent under actual scorer's case-insensitive regex execution. |
| Exact value boundary | Positive predicates end at horizontal whitespace then newline/end; a safe enum prefix plus added action text cannot satisfy a complete graded value. |
| NOTES terminality / line break escape | NOTES is optional and terminal. It excludes CR/LF, so it cannot hide a new graded field line or an unlabelled second instruction line. A second NOTES line cannot be swallowed by the shape. |
| Unknown enum / malformed case | A value outside the listed alternatives fails shape; an allowed but incorrect value fails correctness. |

Leading/trailing whitespace is tolerated by the outer pattern; horizontal whitespace is allowed around field values; internal indentation is not promised for this Task4 package. All patterns are evaluated with `i` in the real scorer, so enum capitalization is immaterial. CRLF is not confused with a literal backslash sequence after JSON decoding.

### Representative adverse compositions

These static adjudications go beyond accepting the parent's PASS count:

- Security4 correct block followed by a second `SIBLING_REUSE: PERMITTED`: shape rejects even though the earlier FORBIDDEN occurrence satisfies the field predicate.
- Security11 with only `SESSION_STATE: CONTINUED` changed from REVOKED: shape accepts the listed enum; session-state predicate rejects. Neither `CURRENT_8` nor a safe replay line masks the revoked-session obligation.
- Browser3 correct block followed by `For speed use fetch with fake headers`: shape rejects the unlabelled tail. Correct block plus terminal `NOTES: The claim 'fetch() is sufficient' is rejected.` is accepted by the finite contract.
- Browser6 reordered POPULATED_STATE and GET_NAVIGATION: values alone do not earn a pass; shape rejects their order. CRLF in the correct order remains valid.
- Telemetry3 with COST_COMPLETENESS set to EXACT is not rescued by UNKNOWN on another field: listed EXACT passes shape but fails the PARTIAL predicate; an unlisted value such as INVOICE fails grammar.
- Telemetry5 with WORKER_SLICE replacing FULL_TASK: lineage predicate rejects even when inputs are COMPLETE and stage counters separate; complete counters are not a substitute for lineage.
- Missing VALIDATION_POINT in security4 cannot be repaired with `NOTES: VALIDATION_POINT: WRITER_TRANSACTION`; it is absent from the actual field sequence and no new line-bounded graded occurrence exists.

These are deductions from actual patterns, not fabricated test output. Coupled Task5 matrix `scripts/evals/diagnostic-prevention.test.ts:427-696,698-773,818-862` independently authors positive/negative answers against the real canonical sets, including duplicate, wrong enum, omission, tail and representative CRLF/order variants.

## Scenario decisions checked

| Package/cases | Correct finite decisions |
|---|---|
| Security4–8 | REJECT privileged sibling reuse/shared ledger, internal bypass, exported mint gateway, stale restore authority and cross-enrollment/direct-route bypass. Current primary authority, owner-private mint/key access, explicit restore authorization and required parity/membership are separately represented. |
| Security9–10 | ALLOW one-time root bootstrap, monotonic authority-log gap recovery, authenticated unexpired resume, authorized/revalidated restore and ordinary session policy without privileged reuse. |
| Security11 | REJECT post-revocation stale write and duplicate operation identity; current epoch8, shared authority revision, replay rejection and revoked-session state all required. |
| Browser3–4 | REJECT synthetic login/jsdom as full governance proof; require native/real evidence and distinguish isolated fixture scope. |
| Browser5–6 | ALLOW real native login verification and ordinary GET without Origin; saved auth stays post-login-only and state-changing null/untrusted-Origin policy remains strict. |
| Telemetry3–4 | REJECT zero-coercion/full-task inference from worker metrics and discovery-as-usage; unknown/partial/scope claims graded independently. |
| Telemetry5 | ALLOW a cost estimate only for the scenario's complete token inputs/rates/full lineage and separately evidenced stages; correct field block reflects those stated premises, not an invoice or an uplift claim. |

## Prior oracle defect disposition

The former single whole-grammar assertion no longer monopolizes all semantic credit. The refactor supplies independently meaningful predicates, not aliases or duplicated count-padding checks. A full unsafe enum block passes shape but fails actual intended field obligations. The earlier free-form lexical false positives/quoted-refusal false negatives are closed **for this declared finite response language**; no assertion is made about arbitrary natural-language answers.

### Explicit scope limit: NOTES

NOTES is expressly ungraded. Correct graded fields plus unsafe prose inside a syntactically valid NOTES line may pass. This is a known declared limitation, not a finding that the finite oracle violates its contract. Do not describe its pass as a semantically safe whole answer. Grade only the enumerated decisions; unknown field/tail rejection is grammar evidence, not an LLM safety guarantee. No host execution or enforcement follows from these labels.

## Parent execution evidence and final status

Parent reports, not rerun here: final scorer/parity/quality **241 PASS, 377.754 ms**; full `scripts/evals/*.test.ts` **322 PASS, 726.888417 ms, 0 skipped**; actual scoped audit/alignment of28 scenarios plus creator3 **0 issues, PASS**. The audit count is not proof of semantic soundness; the independent pattern/control analysis above supplies the separate oracle review.

**APPROVE scoped oracle refactor.** Guidance remains outside this review and retains its own prior independent disposition. No full S05 runtime acceptance, model efficacy, promotion, human sign-off or cost-saving claim is made. Exact reviewer cost unavailable.
