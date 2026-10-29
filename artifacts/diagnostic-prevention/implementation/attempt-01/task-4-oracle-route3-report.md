# Task 4 — Oracle correction, Route 3

**Status:** FINAL for the three owned eval files; parent calibration pending.  
**Route:** Personal · Delivery, per parent assignment.  
**Scope:** `skills/common/common-security-standards/evals/evals.json` (IDs 4–11), `skills/common/common-web-visual-testing/evals/evals.json` (IDs 3–6), and `skills/common/common-telemetry/evals/evals.json` (IDs 3–5). No guidance, Task 2/3/5, scorer, quality-gate, metadata, or policy files changed.

## Change

Each of the 15 finite-field scenarios now has two distinct assertion layers:

1. A whole-response shape regex requires the exact prompted field sequence, exactly one occurrence of each label, one enumerated value per field, and no unknown fields, prose, code fences, or non-whitespace tail. It permits LF or CRLF, horizontal whitespace around values, and an optional final single-line `NOTES:` of at most 300 characters.
2. One independent regex per field requires that field's scenario-correct value. The shape accepts any of that field's enumerated values, including unsafe alternatives; the corresponding correctness assertion rejects an unsafe or otherwise incorrect classification.

This separates format failure from decision failure. It does not duplicate the whole response regex, use banned-word checks, or add assertions unrelated to scenario fields. `NOTES:` remains explicitly ungraded. A correct field matrix with contradictory NOTES may pass; that is field-classification evidence only, not whole-answer safety.

The prompt's existing output contracts, field order, enum choices, expected-output decision facts, and positive/negative scenario premises remain unchanged. This includes security replay/revoke case 11; legitimate security cases 9–10; browser native-form and ordinary-GET positives 5–6; and the full-task cost and observed-stage premises in telemetry case 5.

## Field matrix for Task 5 coordination

For each row, the named safe values are required. Other listed values in the source prompt are syntactically valid shape alternatives and must fail that field's correctness assertion.

| Case | Required field values | Unsafe/incorrect enum alternatives exercised by shape |
|---|---|---|
| Security 4 | `DECISION=REJECT`; `SIBLING_REUSE=FORBIDDEN`; `AUTHORITY_SOURCE=PRIMARY_STORE`; `VALIDATION_POINT=WRITER_TRANSACTION`; `AUDIT_PRINCIPAL=TRUSTED_CONTEXT` | `ALLOW`; `PERMITTED`; `SHARED_LEDGER`; `PRETRANSACTION_SNAPSHOT`; `CALLER_SUPPLIED` |
| Security 5 | `DECISION=REJECT`; `CONTROL_PARITY=REQUIRED`; `AUTHENTICATION=REQUIRED`; `AUDIT_EVIDENCE=PERSISTED_TRUSTED_PROVENANCE` | `ALLOW`; `WAIVED`; `SKIPPED`; `DISABLED` |
| Security 6 | `DECISION=REJECT`; `MINT_API=OWNER_PRIVATE`; `CALLER_KEY_ACCESS=REJECTED`; `CAPABILITY_SCOPE=SINGLE_OPERATION` | `ALLOW`; `PUBLIC_GATEWAY`; `ALLOWED`; `CROSS_OPERATION_REUSE` |
| Security 7 | `DECISION=REJECT`; `RESTORE_AUTHORITY=CURRENT_PRIMARY`; `RESTORE_AUTHORIZATION=EXPLICIT_ROOT`; `POST_RESTORE_CHECK=REVALIDATED` | `ALLOW`; `STALE_SNAPSHOT`; `NOT_REQUIRED`; `SKIPPED` |
| Security 8 | `DECISION=REJECT`; `CROSS_ENROLLMENT_TOKENS=REVOKED`; `DIRECT_API_PARITY=REQUIRED`; `MEMBERSHIP_CHECK=ENFORCED` | `ALLOW`; `RETAINED`; `WAIVED`; `SKIPPED` |
| Security 9 | `DECISION=ALLOW`; `BOOTSTRAP=ONE_TIME_ROOT_ENROLLMENT`; `GAP_RECOVERY=MONOTONIC_AUTHORITY_LOG`; `SESSION_RESUME=AUTHENTICATED_UNEXPIRED` | `REJECT`; `SHARED_STATIC_SECRET`; `UNBOUNDED_CLIENT_REPLAY`; `UNVERIFIED_CLIENT_CLAIM` |
| Security 10 | `DECISION=ALLOW`; `BACKUP_RESTORE=AUTHORIZED_THEN_REVALIDATED`; `SESSION_REUSE=ORDINARY_SESSION_POLICY`; `PRIVILEGED_MINT=OWNER_PRIVATE` | `REJECT`; `STALE_STATE_ACCEPTED`; `CROSS_OPERATION_PRIVILEGED_REUSE`; `SIBLING_GATEWAY` |
| Security 11 | `DECISION=REJECT`; `AUTHORITY_EPOCH=CURRENT_8`; `REPLAY_CONSUMPTION=REJECTED`; `WRITER_SERIALIZATION=SHARED_AUTHORITY_REVISION`; `SESSION_STATE=REVOKED` | `ALLOW`; `STALE_7`; `DUPLICATE_ACCEPTED`; `ACCOUNT_ONLY`; `CONTINUED` |
| Browser 3 | `DECISION=REJECT`; `LOGIN_PROOF=NATIVE_FORM_REAL_BROWSER`; `ORIGIN_CSRF=VERIFIED`; `LANDING_STATE=POPULATED_DOM` | `ALLOW`; `FETCH_WITH_HEADERS`; `DISABLED`; `MOCK_COOKIE` |
| Browser 4 | `DECISION=REJECT`; `FULL_LOGIN_GOVERNANCE=NO`; `JSDOM_SCOPE=ISOLATED_COMPONENT_ONLY`; `SESSION_COOKIE_EVIDENCE=REAL_HTTP_RESPONSE` | `ALLOW`; `YES`; `FULL_BACKEND_PROOF`; `MOCK_COOKIE` |
| Browser 5 | `DECISION=ALLOW`; `LOGIN_PROOF=NATIVE_FORM_REAL_BROWSER`; `ORIGIN_CSRF=VERIFIED`; `SAVED_AUTH_USE=POST_LOGIN_SCREENS_ONLY` | `REJECT`; `FETCH_WITH_HEADERS`; `DISABLED`; `LOGIN_GOVERNANCE_PROOF` |
| Browser 6 | `DECISION=ALLOW`; `GET_NAVIGATION=VALID_WITHOUT_ORIGIN`; `POPULATED_STATE=ASSERTED`; `NULL_ORIGIN_POLICY=STRICT_FOR_STATE_CHANGING` | `REJECT`; `INVALID_MISSING_ORIGIN`; `SKIPPED`; `CORS_WAIVED` |
| Telemetry 3 | `DECISION=REJECT`; `MISSING_METRICS=UNKNOWN`; `COST_COMPLETENESS=PARTIAL`; `COST_SCOPE=WORKER_SLICE` | `ALLOW`; `ZERO`; `EXACT`; `FULL_TASK` |
| Telemetry 4 | `DECISION=REJECT`; `LISTED_SKILLS=DISCOVERY_ONLY`; `BODY_FETCH=UNKNOWN`; `USAGE_CLAIM=UNSUPPORTED` | `ALLOW`; `FETCHED_AND_USED`; `ASSUMED`; `EVIDENCED` |
| Telemetry 5 | `DECISION=ALLOW`; `COST_COMPLETENESS=COMPLETE`; `TOKEN_INPUTS=COMPLETE`; `LINEAGE_SCOPE=FULL_TASK`; `STAGE_ACCOUNTING=SEPARATE`; `USAGE_CLAIM=EVIDENCED` | `REJECT`; `PARTIAL`; `MISSING`; `WORKER_SLICE`; `CONFLATED`; `UNSUPPORTED` |

The real scorer applies regex assertions through `new RegExp(value, "i").test(transcript)` without multiline or dotall flags; the shape and field regexes are written for those semantics. `quality.ts` checks assertion count, type validity, and contains-value anchoring; regex assertions are exempt from contains-value anchoring. The current `quality.ts` count rule rejects an eval with one assertion. Every scenario now has a shape assertion plus separate field-value assertions, not a shape-only single assertion.

## Verification boundary and evidence identity

- Inspected the real scorer (`scripts/evals/scorer.ts:172-209`) and quality assertion-count rule (`scripts/evals/quality.ts:435-455`).
- The read/edit tools parsed and displayed the updated JSON regions; the security edit response identified the final snapshot as `#7DA6`, browser as `#4FC7`, and telemetry as `#935B`.
- These are reader snapshot tags, **not cryptographic digests**. No SHA-256 was available from the read tool; no shell command or checksum was run.
- No scorer, quality-gate, test, build, lint, formatter, or generator was run. Parent owns real-scorer and quality-gate verification after the final freeze.
- No result here establishes runtime/security behavior, model efficacy, or host enforcement.
