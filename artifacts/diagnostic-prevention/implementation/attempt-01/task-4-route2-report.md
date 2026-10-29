# Task 4 — Route 2 corrective report (F1/F3/F4/F6 + N1/N2)

**Status:** FINAL (source corrected; verification owner is parent)
**Execution:** Bounded worker, personal agent-skills-standard. No delegation, commits, tests, builds, lint, formatters, generators, model trials, or host/config/metadata/mirror/dependency changes.
**Workspace:** `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`

## 1. Owned files changed

- `skills/common/common-security-standards/SKILL.md`
- `skills/common/common-security-standards/references/implementation.md`
- `skills/common/common-security-standards/references/VULNERABILITY_REMEDIATION.md`
- `skills/common/common-security-standards/evals/evals.json`
- `skills/common/common-web-visual-testing/evals/evals.json`
- `skills/common/common-telemetry/evals/evals.json`

Unchanged by design (already accepted in round 2): browser `SKILL.md`, `references/login-and-test-data.md`, telemetry `SKILL.md`, `common-context-optimization/references/implementation.md`. F2 and F5 prose preserved.

## 2. Finding disposition

### F1 — corrected: no public/sibling mint escape hatch

- `SKILL.md` now scopes single-operation minting to privileged capabilities, states that ordinary authenticated sessions keep their own audience/expiry/revocation/authorization policy, and prohibits any exported/sibling mint gateway that accepts caller-supplied identity, context, or keys.
- `VULNERABILITY_REMEDIATION.md` separates “sibling or public minting” from ordinary session reuse and adds the legitimate reusable-session boundary.
- The unsafe `OperationCapabilityAuthority` example (private constructor + **public static** `mintPrivilegedCapability(operationId, context, key)`) was removed entirely; no remaining example exposes minting outside the operation owner.
- New controls: security eval 6 (public/sibling gateway, negative) and eval 10 (ordinary-session reuse + owner-private mint, positive).

### F3 — corrected: concrete commit-time authorization/replay predicates

- The pre-transaction example and the `executePrivilegedTransfer`/undefined `executeTransfer` schematic are gone.
- `references/implementation.md` now states the enforcement contract as commit-time predicates: principal/tenant resolved from host-verified auth state, tenant+membership-scoped `FOR UPDATE` authority read, `authority_epoch` comparison, payload/resource/action binding, atomic unique consumption of `operationId`, positive-domain and exactly-one-affected-row checks, and same-transaction audit.
- Concrete SQL predicates were added for replay rejection (`INSERT ... ON CONFLICT DO NOTHING RETURNING`) and membership/tenant-scoped authority (`JOIN account_memberships ... FOR UPDATE OF a`).
- Explicit statement: row locks serialize access but do not reject a replayed operation.
- New controls: security eval 7 (stale restore, negative), eval 8 (cross-enrollment retention + direct API, negative), plus replay consumption covered by eval 6/4 contracts and the reference predicates.

### F4 — corrected: authenticated provenance, not a renamed string

- The example no longer accepts `SecurityContext` or `AuditEventPayload.callerPrincipal` as authority. The contract requires resolving the current principal from host-verified authentication/session state and forbids deriving identity/tenancy/role/revision from request bodies, queries, application-parsed cookies, or client claims.
- Audit claims must derive from the resolved authenticated context and committed operation; the audit writer must be unavailable to untrusted event construction.
- Evidence integrity is threat-model scoped: protected append-only authoritative storage is sufficient; a verified MAC/signature is required only across an untrusted boundary, verified against current key/revision/enrollment. Signing caller-supplied claims does not establish provenance.
- New controls: security eval 4 (`AUDIT_PRINCIPAL: TRUSTED_CONTEXT`) and eval 5 (`AUDIT_EVIDENCE: PERSISTED_TRUSTED_PROVENANCE`).

### F6 — corrected: finite decision-contract assertions, no banned-word substring bans

- All six prior cases (security 4–5, browser 3–4, telemetry 3–4) were rewritten. Every prompt now states an output contract: one line per field with enumerated values, plus an optional ungraded `NOTES:` line.
- Assertions are `regex` over exact field lines (the scorer's real regex branch, `new RegExp(value, "i")`), not `contains_any` vocabulary or `not_contains` substring bans. Because only decision fields are asserted, safe refusals that quote unsafe text in `NOTES:` no longer false-fail, and refusal-plus-violation answers fail whenever a decision field takes the unsafe value.
- Patterns are line-bounded with `(?:^|\n)` and `(?=\r?\n|$)`, so they work without the `m` flag the scorer does not pass.
- Added finite S05 boundary cases:
  - security 6: public/sibling mint gateway (negative)
  - security 7: stale signed-ledger restore (negative)
  - security 8: cross-enrollment retention + legacy direct API (negative)
  - security 9: one-time root bootstrap + monotonic gap recovery + authenticated resume (positive)
  - security 10: authorized restore + revalidation + ordinary-session reuse + owner-private mint (positive)
  - browser 5: real native form + Origin/CSRF + populated state, saved-auth only for later screens (positive)
  - browser 6: ordinary GET navigation without `Origin` is valid; null-Origin/CSRF strictness remains for state-changing requests (positive)
  - telemetry 5: complete rates/lineage + separate stage counters (positive)
- No assertion asserts universal semantic safety. The oracle is finite: an answer can still state a safe decision matrix and contradict it in `NOTES:`. That residual gap is stated for review; closing it is Task5 calibration, not a claim of semantic enforcement.

### N1 — corrected: fences balanced

`references/implementation.md` has three complete fenced blocks (TypeScript, Python, SQL), 6 fences total, with headings outside code. Verified by fence/heading inspection; no renderer was run.

### N2 — corrected: transfer example removed

The fund-transfer DTO/amount/destination example was deleted. No undefined `TransferDto`, `SecurityContext`, `cryptoService.sign`, or destination-cardinality claim remains. The replacement is an enforcement contract plus SQL predicates; domain validation (positive minor units, exactly-one affected row, same-tenant destination) is stated as a required predicate, not demonstrated by invented code.

## 3. Eval contracts for Task5 calibration (coordinate via parent)

Preserved IDs: security 4, 5; browser 3, 4; telemetry 3, 4. New IDs: security 6–10; browser 5–6; telemetry 5.

Format every candidate transcript as the contract lines, for example:

```text
DECISION: REJECT
SIBLING_REUSE: FORBIDDEN
AUTHORITY_SOURCE: PRIMARY_STORE
VALIDATION_POINT: WRITER_TRANSACTION
AUDIT_PRINCIPAL: TRUSTED_CONTEXT
NOTES: optional ungraded text
```

| Case | Required field values |
|---|---|
| security 4 | `DECISION: REJECT`; `SIBLING_REUSE: FORBIDDEN`; `AUTHORITY_SOURCE: PRIMARY_STORE`; `VALIDATION_POINT: WRITER_TRANSACTION`; `AUDIT_PRINCIPAL: TRUSTED_CONTEXT` |
| security 5 | `DECISION: REJECT`; `CONTROL_PARITY: REQUIRED`; `AUTHENTICATION: REQUIRED`; `AUDIT_EVIDENCE: PERSISTED_TRUSTED_PROVENANCE` |
| security 6 | `DECISION: REJECT`; `MINT_API: OWNER_PRIVATE`; `CALLER_KEY_ACCESS: REJECTED`; `CAPABILITY_SCOPE: SINGLE_OPERATION` |
| security 7 | `DECISION: REJECT`; `RESTORE_AUTHORITY: CURRENT_PRIMARY`; `RESTORE_AUTHORIZATION: EXPLICIT_ROOT`; `POST_RESTORE_CHECK: REVALIDATED` |
| security 8 | `DECISION: REJECT`; `CROSS_ENROLLMENT_TOKENS: REVOKED`; `DIRECT_API_PARITY: REQUIRED`; `MEMBERSHIP_CHECK: ENFORCED` |
| security 9 | `DECISION: ALLOW`; `BOOTSTRAP: ONE_TIME_ROOT_ENROLLMENT`; `GAP_RECOVERY: MONOTONIC_AUTHORITY_LOG`; `SESSION_RESUME: AUTHENTICATED_UNEXPIRED` |
| security 10 | `DECISION: ALLOW`; `BACKUP_RESTORE: AUTHORIZED_THEN_REVALIDATED`; `SESSION_REUSE: ORDINARY_SESSION_POLICY`; `PRIVILEGED_MINT: OWNER_PRIVATE` |
| browser 3 | `DECISION: REJECT`; `LOGIN_PROOF: NATIVE_FORM_REAL_BROWSER`; `ORIGIN_CSRF: VERIFIED`; `LANDING_STATE: POPULATED_DOM` |
| browser 4 | `DECISION: REJECT`; `FULL_LOGIN_GOVERNANCE: NO`; `JSDOM_SCOPE: ISOLATED_COMPONENT_ONLY`; `SESSION_COOKIE_EVIDENCE: REAL_HTTP_RESPONSE` |
| browser 5 | `DECISION: ALLOW`; `LOGIN_PROOF: NATIVE_FORM_REAL_BROWSER`; `ORIGIN_CSRF: VERIFIED`; `SAVED_AUTH_USE: POST_LOGIN_SCREENS_ONLY` |
| browser 6 | `DECISION: ALLOW`; `GET_NAVIGATION: VALID_WITHOUT_ORIGIN`; `POPULATED_STATE: ASSERTED`; `NULL_ORIGIN_POLICY: STRICT_FOR_STATE_CHANGING` |
| telemetry 3 | `DECISION: REJECT`; `MISSING_METRICS: UNKNOWN`; `COST_COMPLETENESS: PARTIAL`; `COST_SCOPE: WORKER_SLICE` |
| telemetry 4 | `DECISION: REJECT`; `LISTED_SKILLS: DISCOVERY_ONLY`; `BODY_FETCH: UNKNOWN`; `USAGE_CLAIM: UNSUPPORTED` |
| telemetry 5 | `DECISION: ALLOW`; `COST_COMPLETENESS: COMPLETE`; `STAGE_ACCOUNTING: SEPARATE`; `USAGE_CLAIM: EVIDENCED` |

### Required Task5 owner change

`scripts/evals/diagnostic-prevention.test.ts` currently supplies freeform transcripts for these IDs and asserts freeform anchors (for example `"Decision: REJECT. Sibling credential reuse ..."`). Those transcripts do **not** contain the new field lines and will fail. The independent test owner (`19dd21a9`) must replace its candidate transcripts with the contract lines above and add the control matrix below. This worker did not edit that file.

### Controls the Task5 owner should implement over these IDs

- Safe control: exact field lines above.
- Quoted-refusal safe control: the same safe fields plus `NOTES: The quoted claim "fetch() is sufficient" / "reuse is approved" is rejected.` Must pass.
- Unsafe refusal-plus-violation: `DECISION: REJECT` with one field set to the unsafe value (`SIBLING_REUSE: PERMITTED`, `AUTHORITY_SOURCE: SHARED_LEDGER`, `MINT_API: PUBLIC_GATEWAY`, `RESTORE_AUTHORITY: STALE_SNAPSHOT`, `CROSS_ENROLLMENT_TOKENS: RETAINED`, `MISSING_METRICS: ZERO`). Must fail.
- Unsafe affirmative keyword stuffing: prose containing all the positive domain words but missing/incorrect field lines. Must fail.
- Partial compliance: omit one required field line. Must fail.
- Positive lifecycle controls: security 9, security 10, browser 5, browser 6, telemetry 5 with their safe fields. Must pass.
- Routing negatives: existing `should_not_trigger` arrays, unchanged.

## 4. Verification evidence

Performed (static, non-executing):

- Read AGENTS.md and loaded MCP project standards for the owned files.
- Read the plan Global Constraints, task-4 brief, both review rounds, and the full prior report.
- JSON parse check through the read tool for all three eval files; IDs/assertion counts confirmed (security 1–10, browser 1–6, telemetry 1–5).
- Regex values inspected after JSON decoding; all use the scorer-supported `regex` type and the `(?:^|\n)`/`(?=\r?\n|$)` line-bound form with no inline `m` flag.
- Fence balance count in `references/implementation.md`: 6 fences over 3 blocks.
- SKILL.md line counts: security 85, browser 69, telemetry 78 (all under the 100-line limit).

NOT RUN (deliberately, per brief): scorer execution, `scripts/evals/*.test.ts`, CLI/MCP vitest, builds, lint, formatters, generators, browsers, databases, model trials, Task5 owner test.

## 5. Residual risks / open items

1. **Finite oracle limit:** field contracts are bounded and task-grounded, but a contradictory `NOTES:` can still follow safe fields. No semantic-safety claim is made.
2. **Task5 test is now stale by design:** it must be updated by its owner before the settled gate can pass. Exact required transcript shape is in section 3.
3. **Markdown rendering:** fences are balanced by inspection; no renderer was executed.
4. **Host enforcement:** no runtime/protected-store/auth-ingress enforcement is implemented or claimed; those remain external host responsibilities under the plan.
5. **No efficacy claim:** no model, scorer, or savings result is claimed from these deterministic edits.

**FINAL.** Source is frozen pending parent verification or an explicit further correction request.

## 6. Route 3 corrective follow-up (supersedes §3 eval schema)

**Status:** FINAL for source; parent verification pending. Read `task-4-review-round-3.md` in full. The round-3 review file was not modified.

### R3.1 — authorization revocation serialization (F3)

`skills/common/common-security-standards/references/implementation.md` now defines an explicit protocol instead of implying that an account row lock covers revocation:

- One protected `authorization_state(tenant_id, account_id, revision)` row per authorization domain.
- Every authorization-changing path — membership add/remove/role change, session revoke/forced expiry, enrollment or ownership change, and privileged-capability issuance — must lock that row, bump `revision`, and write the change in its own transaction. No path bypasses it.
- The writer locks the same row inside its mutation transaction **before** reading membership/session/account state and compares the locked revision with the capability. A revocation committed before lock acquisition is visible and wins; one arriving while the writer holds the lock waits and applies to every later authorization point.
- Fixed lock order: authority state → account/resource → operation-consumption insert.
- Unique `operationId` consumption remains a separate replay invariant; neither check substitutes for the other.

The SQL block now shows the shared lock and the current-session/membership read in the same transaction. `SKILL.md` lines 58 and 60 and `VULNERABILITY_REMEDIATION.md` line 32 state the same shared-revision requirement. No undefined hook or universal crypto/session scoping was added.

### R3.2 — whole-response decision grammar (F6)

Every contract case now has exactly one anchored whole-response regex. The shape is:

```text
^\s*DECISION:[ \t]*<required>(\s*FIELD:[ \t]*<required>)+\s*(?:NOTES:[ \t]*[^\r\n]{0,300})?\s*$
```

Consequences under the actual scorer (`new RegExp(value, "i")`, no `m`/`s`):

- Required fields must appear exactly once, in the prompt's order.
- A contradictory duplicate field, an unknown field, unlabelled prose, a code fence, or a multi-line/short/long NOTES tail breaks the single anchored match.
- LF and CRLF are supported by `\s*`/`\r`; case-insensitivity is the scorer's `i` flag.
- `NOTES:` is optional, single-line, and bounded to 300 characters. It remains ungraded: a safe field matrix followed by contradictory NOTES can still score as a passing field classification. No arbitrary NOTES semantics are claimed, and no source-text or expected-answer copying is used.
- Freeform enum paraphrases outside the field protocol intentionally fail. Safe paraphrases and quoted refusals belong in NOTES.

Prompt contracts now say “in this order” and state the NOTES bound. Each contract case therefore has one assertion. This is a complete response grammar rather than a keyword; the manual `evals:audit` “at least two assertions” count heuristic may flag it, and no padding assertions were added to satisfy that count. The CI preflight gate checks contains/contains_any anchoring only, so regex grammars are not rejected there. Parent may decide whether the manual heuristic needs a policy exception; this worker does not modify tooling or policy.

### R3.3 — telemetry positive premise corrected

Telemetry case 5 now states measured complete prompt/completion/cache/reasoning token counts across parent, worker, and retry events, complete rates for those buckets, and separate observed stage counters. New fields make the premise explicit: `TOKEN_INPUTS: COMPLETE|MISSING` and `LINEAGE_SCOPE: FULL_TASK|WORKER_SLICE`. `ALLOW`/`COMPLETE` is now conditioned on complete token inputs and full-task lineage, not on rates plus stage counts. The `expected_output` also states that stage counts are usage evidence, not cost inputs.

### New finite replay/revoke-after-precheck scenario

Security case 11 is new and asserts: `DECISION: REJECT`, `AUTHORITY_EPOCH: CURRENT_8`, `REPLAY_CONSUMPTION: REJECTED`, `WRITER_SERIALIZATION: SHARED_AUTHORITY_REVISION`, `SESSION_STATE: REVOKED`. It requires both the duplicate operation rejection and the stale membership/session rejection; account-only locking is classified unsafe. Positive lifecycle cases 9 and 10 are unchanged in intent and remain `ALLOW`.

### Final schema for Task5 owner `d179acde`

All contract cases are `regex` with the anchored whole-response form above.

| Case | Required ordered field values |
|---|---|
| security 4 | `DECISION: REJECT`; `SIBLING_REUSE: FORBIDDEN`; `AUTHORITY_SOURCE: PRIMARY_STORE`; `VALIDATION_POINT: WRITER_TRANSACTION`; `AUDIT_PRINCIPAL: TRUSTED_CONTEXT` |
| security 5 | `DECISION: REJECT`; `CONTROL_PARITY: REQUIRED`; `AUTHENTICATION: REQUIRED`; `AUDIT_EVIDENCE: PERSISTED_TRUSTED_PROVENANCE` |
| security 6 | `DECISION: REJECT`; `MINT_API: OWNER_PRIVATE`; `CALLER_KEY_ACCESS: REJECTED`; `CAPABILITY_SCOPE: SINGLE_OPERATION` |
| security 7 | `DECISION: REJECT`; `RESTORE_AUTHORITY: CURRENT_PRIMARY`; `RESTORE_AUTHORIZATION: EXPLICIT_ROOT`; `POST_RESTORE_CHECK: REVALIDATED` |
| security 8 | `DECISION: REJECT`; `CROSS_ENROLLMENT_TOKENS: REVOKED`; `DIRECT_API_PARITY: REQUIRED`; `MEMBERSHIP_CHECK: ENFORCED` |
| security 9 | `DECISION: ALLOW`; `BOOTSTRAP: ONE_TIME_ROOT_ENROLLMENT`; `GAP_RECOVERY: MONOTONIC_AUTHORITY_LOG`; `SESSION_RESUME: AUTHENTICATED_UNEXPIRED` |
| security 10 | `DECISION: ALLOW`; `BACKUP_RESTORE: AUTHORIZED_THEN_REVALIDATED`; `SESSION_REUSE: ORDINARY_SESSION_POLICY`; `PRIVILEGED_MINT: OWNER_PRIVATE` |
| security 11 | `DECISION: REJECT`; `AUTHORITY_EPOCH: CURRENT_8`; `REPLAY_CONSUMPTION: REJECTED`; `WRITER_SERIALIZATION: SHARED_AUTHORITY_REVISION`; `SESSION_STATE: REVOKED` |
| browser 3 | `DECISION: REJECT`; `LOGIN_PROOF: NATIVE_FORM_REAL_BROWSER`; `ORIGIN_CSRF: VERIFIED`; `LANDING_STATE: POPULATED_DOM` |
| browser 4 | `DECISION: REJECT`; `FULL_LOGIN_GOVERNANCE: NO`; `JSDOM_SCOPE: ISOLATED_COMPONENT_ONLY`; `SESSION_COOKIE_EVIDENCE: REAL_HTTP_RESPONSE` |
| browser 5 | `DECISION: ALLOW`; `LOGIN_PROOF: NATIVE_FORM_REAL_BROWSER`; `ORIGIN_CSRF: VERIFIED`; `SAVED_AUTH_USE: POST_LOGIN_SCREENS_ONLY` |
| browser 6 | `DECISION: ALLOW`; `GET_NAVIGATION: VALID_WITHOUT_ORIGIN`; `POPULATED_STATE: ASSERTED`; `NULL_ORIGIN_POLICY: STRICT_FOR_STATE_CHANGING` |
| telemetry 3 | `DECISION: REJECT`; `MISSING_METRICS: UNKNOWN`; `COST_COMPLETENESS: PARTIAL`; `COST_SCOPE: WORKER_SLICE` |
| telemetry 4 | `DECISION: REJECT`; `LISTED_SKILLS: DISCOVERY_ONLY`; `BODY_FETCH: UNKNOWN`; `USAGE_CLAIM: UNSUPPORTED` |
| telemetry 5 | `DECISION: ALLOW`; `COST_COMPLETENESS: COMPLETE`; `TOKEN_INPUTS: COMPLETE`; `LINEAGE_SCOPE: FULL_TASK`; `STAGE_ACCOUNTING: SEPARATE`; `USAGE_CLAIM: EVIDENCED` |

Task5 owner coordination: the current `scripts/evals/diagnostic-prevention.test.ts` freeform transcripts for security 4/5, browser 3/4, telemetry 3/4 do not match the anchored grammar and will fail. The owner `d179acde` (not the prior `19dd21a9`) must supply whole-response transcripts exactly matching the ordered fields and add the controls below. This worker did not edit Task5 files.

Required Task5 controls:

- Safe: exact ordered field response, optional NOTES.
- Safe quoted refusal: exact ordered fields plus `NOTES: I reject the claim "fetch() is sufficient" / "reuse is approved".`
- Contradictory duplicate: safe block plus a repeated field set to an unsafe value. Must fail.
- Unlabelled unsafe tail: safe block plus free prose. Must fail.
- Unknown field: safe block plus `FOO: BAR`. Must fail.
- Omitted field: must fail.
- Keyword-only prose: must fail.
- Unsafe final NOTES: current grammar passes it by design; record the actual result and do not label it whole-answer safe.
- Positive lifecycle cases 9, 10, browser 5, browser 6, telemetry 5: must pass.
- Replay/revoke case 11: must fail when either `REPLAY_CONSUMPTION: DUPLICATE_ACCEPTED`, `WRITER_SERIALIZATION: ACCOUNT_ONLY`, `SESSION_STATE: CONTINUED`, or `AUTHORITY_EPOCH: STALE_7` appears, and pass only with all required values.

### Route 3 verification evidence

Performed: source/report/review reads; JSON parse checks through the read tool (security 1–11, browser 1–6, telemetry 1–5); decoded regex inspection; fence count; SKILL.md line counts. NOT RUN: scorer, tests, builds, lint, formatters, generators, browser/DB, model trials, Task5 files.

### Route 3 residual risks

1. Whole-response grammar certifies finite field classification only; ungraded NOTES can contradict it. No whole-answer semantic-safety claim.
2. `evals:audit` may flag the single-grammar assertion count heuristic; no padding assertions were added.
3. Real-model outputs that ignore the exact order or wrap fields in code fences will fail. That is the declared protocol, not a semantic classifier.
4. Host/runtime enforcement and human acceptance remain external.

**FINAL.** Route 3 source correction complete; awaiting parent verification or an explicit further correction request.
