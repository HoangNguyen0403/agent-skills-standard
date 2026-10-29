# Task 4 Report: Trust Boundary, Browser and Accounting Guidance (S05)

**Status:** FINAL  
**Execution Mode:** Inline (Approved Bounded Worker, personal agent-skills-standard)  
**Profile Materialized:** `Personal - Cheap`  
**Workspace:** `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`  
**Branch:** `feat/diagnostic-prevention-improvements`  

---

## 1. Summary of Changes & Owned Write Set

In strict accordance with Task 4 requirements in `artifacts/diagnostic-prevention/implementation/attempt-01/task-4-brief.md`, all changes were strictly confined to the owned write set:
- `skills/common/common-security-standards/**`
- `skills/common/common-web-visual-testing/**`
- `skills/common/common-telemetry/**`
- `skills/common/common-context-optimization/references/implementation.md`

No new skills or collectors were created. No installed copies, metadata, mirrors, dependencies, or host policies were mutated.

### Detailed Modifications:

1. **`skills/common/common-security-standards/`**:
   - **`SKILL.md`**: Added a concise canonical section on `Trust Boundaries & Authority Lifecycle`:
     - *Operation-Private Minting*: Session tokens and authorization credentials minted strictly within the requesting operation; no sibling reuse.
     - *Independently Protected Authority*: Re-verification against authoritative authority sources; rejection of stale cached ledgers.
     - *Authenticated Persisted Evidence*: Audit artifacts signed and cryptographically bound to caller provenance.
     - *Transaction-Time Revalidation*: Re-verifying tenancy and permissions immediately before state mutations.
     - *Alternate Public APIs & Parity*: Identical security controls and rate limiting across alternate, internal, batch, and legacy entrypoints.
     - *Multi-Connection & Concurrency Races*: Guarding against parallel races via transactional isolation and atomic conditional updates.
     - *Lifecycle Rejection*: Explicit rejection of stale ledgers, sibling mints, direct bypass APIs, and cross-enrollment retention, while preserving legitimate bootstrap, gap recovery, authenticated resume, and explicit restore lifecycles.
   - **`references/implementation.md`**: Added TypeScript reference examples for operation-private credential minting, transaction-time revalidation, and cryptographic signature attachment on persisted audit evidence.
   - **`references/VULNERABILITY_REMEDIATION.md`**: Added detailed lifecycle rules on rejecting stale ledgers, sibling minting, direct API bypass, cross-enrollment retention, and concurrency race handling.
   - **`evals/evals.json`**: Added finite scenario evals with grounded assertions:
     - Case 4: Rejection of shared Redis auth ledger and credential reuse across sibling operations (asserts operation-private minting, revalidation against authoritative source, and concurrency race protection).
     - Case 5: Rejection of auth/audit bypass on internal batch transfer endpoints (asserts API parity, Zero Trust, and authenticated evidence provenance).

2. **`skills/common/common-web-visual-testing/`**:
   - **`SKILL.md`**: Added canonical guidance on `Browser Origin & Native Form Governance`:
     - Real browser form submissions and user navigations must generate authentic browser `Origin` and `Referer` headers.
     - Strict rejection of null/spoofed origins and CSRF mismatches.
     - Actual populated rendered DOM states required for proof; synthetic auth illusion (standalone `fetch()`, manual header overrides, saved auth state injection, or renderer-only DOM fixtures) rejected as proof of backend session governance.
     - Added anti-pattern: *Synthetic Auth Illusion*.
   - **`references/login-and-test-data.md`**: Documented requirements for native form and navigation origin validation, strict CSRF enforcement in test harnesses, and the necessity of actual populated landing states over jsdom or synthetic doubles.
   - **`evals/evals.json`**: Added finite scenario evals:
     - Case 3: Rejection of `fetch()` credential posting / mock header injection in lieu of real browser form submission (asserts Origin/CSRF, real browser native form, and populated landing state).
     - Case 4: Rejection of jsdom/renderer-only component fixtures as backend session cookie governance proof (asserts renderer-only fixture limits, backend cookie governance, and native Origin/CSRF verification).

3. **`skills/common/common-telemetry/`**:
   - **`SKILL.md`**: Added canonical contract section on `Accounting Boundaries & Lineage Semantics`:
     - *Missing ≠ Zero*: Missing runtime metric or token count fields remain `unknown` or `unavailable`; never coerced to 0 or $0.00.
     - *Partial Lineage & Incomplete Rates*: Incomplete rates or subagent traces mark total cost as `partial` or `unknown`.
     - *Subagent & Worker Cost Scope*: Worker-only metrics represent partial task scope; never reported as whole-task totals or net savings without full baselines.
     - *Discovery Lifecycle Distinctness*: Strict distinction between catalog discovery (skills listed/indexed) ≠ body fetched (skill markdown loaded) ≠ delivered to agent context ≠ actively used/applied in generation. Persisted telemetry must not assert usage when only discovery occurred.
     - *Efficacy & Savings Claims*: No model efficacy uplift or token savings claimed without qualified, independently reproducible measurement evidence.
     - Added anti-patterns: *No zero-coercion of missing metrics* and *No conflating catalog discovery with usage*.
   - **`evals/evals.json`**: Added finite scenario evals:
     - Case 3: Rejection of zero-coercion for missing prompt tokens in partial worker metrics (asserts missing ≠ 0, partial lineage, worker scope).
     - Case 4: Rejection of claiming 15 skills used when only returned in a discovery list (asserts distinct catalog discovery, body fetch, and active usage lifecycles).

4. **`skills/common/common-context-optimization/references/implementation.md`**:
   - Extended the `Cost & Accounting Boundaries` section with explicit accounting invariants:
     - Missing ≠ zero semantics.
     - Partial lineage when rates/traces are incomplete.
     - Distinction between worker-only slices and full-task totals.
     - Four-stage lifecycle distinction: (1) Catalog discovery, (2) Body fetch, (3) Delivery, (4) Active usage.
     - Prohibition of efficacy or savings claims without qualified measurement evidence.

---

## 2. Invariants & Security Boundaries

- **Concise Canonical Bodies**: Entrypoint `SKILL.md` files maintain succinct, actionable rules with comprehensive details preserved in existing reference documents.
- **Real Scorer Compatibility**: Eval cases use valid assertion types (`contains`, `contains_any`) supported by `scripts/evals/scorer.ts` (`checkAssertion`).
- **No Parallel Collectors or Schemas**: Maintained existing schemas and field structures without creating new collectors or changing telemetry schemas.
- **Truthful Status**: No model uplift, token savings, or runtime RED states are claimed; verification is delegated to the parent post-freeze gate.

---

## 3. Eval IDs & Controls Summary

| Skill | Eval ID | Description / Scenario | Control Type | Assertions Verified |
|---|---|---|---|---|
| `common-security-standards` | 4 | Sibling operation credential reuse & Redis ledger caching | Negative / Rejection control | Asserts operation-private minting, revalidation of authority, concurrency race protection |
| `common-security-standards` | 5 | Alternate internal batch API auth/audit bypass | Negative / Rejection control | Asserts alternate API parity, authenticated evidence provenance |
| `common-web-visual-testing` | 3 | Synthetic `fetch()` & manual header login bypass | Negative / Rejection control | Asserts Origin/CSRF verification, real browser native form, populated state |
| `common-web-visual-testing` | 4 | jsdom / renderer-only fixture claiming backend governance | Negative / Rejection control | Asserts renderer-only limits, backend cookie governance, Origin/CSRF |
| `common-telemetry` | 3 | Missing prompt token coercion to 0 for cost total | Negative / Rejection control | Asserts missing ≠ 0, partial lineage, worker scope |
| `common-telemetry` | 4 | Conflating catalog discovery count with active agent usage | Negative / Rejection control | Asserts distinct discovery, body fetch, and active usage stages |

---

## 4. Verification Commands for Parent (Settled Gates)

Per global constraints and brief instructions, build/lint/test/formatters were **SKIPPED MID-FLIGHT** to maintain isolation and prevent premature runs before all owners freeze.

### Commands NOT RUN:
1. `rtk proxy node --import tsx --test scripts/evals/diagnostic-prevention.test.ts` (Planned for parent Task 5 calibration)
2. `rtk proxy node --import tsx --test scripts/evals/assertion-parity.test.ts`
3. `rtk pnpm --filter ./mcp exec vitest run test/Tools.spec.ts`

### Recommended Parent Calibration Gate:
Once Tasks 2–4 are frozen, Task 5 / Parent should run the real-scorer assertion parity tests across these evals to verify schema and scorer pass rates:
```bash
rtk proxy node --import tsx --test scripts/evals/assertion-parity.test.ts
```

---

## 5. Changed Files

- `skills/common/common-security-standards/SKILL.md`
- `skills/common/common-security-standards/references/implementation.md`
- `skills/common/common-security-standards/references/VULNERABILITY_REMEDIATION.md`
- `skills/common/common-security-standards/evals/evals.json`
- `skills/common/common-web-visual-testing/SKILL.md`
- `skills/common/common-web-visual-testing/references/login-and-test-data.md`
- `skills/common/common-web-visual-testing/evals/evals.json`
- `skills/common/common-telemetry/SKILL.md`
- `skills/common/common-telemetry/evals/evals.json`
- `skills/common/common-context-optimization/references/implementation.md`
- `artifacts/diagnostic-prevention/implementation/attempt-01/task-4-report.md`

---

## 6. Corrective Follow-Up Round 1 (Matrix Remediation)

**Reviewer Finding Reference:** `task-4-review-round-1.diff` & Review Prompt

### Remediations Applied:
1. **Privileged Capability vs Ordinary Session Scope**:
   - Reconciled `skills/common/common-security-standards/SKILL.md` to state clearly that ordinary user sessions follow their intended lifetime and standard authorization; only privileged mint, seal, restore, or high-risk mutation capabilities are scoped to operation-private issuers and single-operation lifetimes.
   - Clarified that authenticated audit evidence requires authentic caller provenance and tamper-evident controls, but not universal cryptographic signatures for every routine log entry.
2. **Atomic In-Transaction Revalidation & Trusted Principal Extraction**:
   - Replaced flawed pre-transaction authority checks in `skills/common/common-security-standards/references/implementation.md`.
   - The new implementation extracts the caller principal from a trusted `SecurityContext` (not caller-supplied signed claims).
   - Demonstrates a true operation-private capability token with a private mint method (`mintPrivilegedCapability`) and validator-only verification (`verifyPrivilegedCapability`).
   - Enforces authority revalidation, capability validation, balance checking, mutation, and audit event persistence atomically within the SAME writer transaction (`db.transaction(async (tx) => ...)`) with row locks (`FOR UPDATE`), eliminating multi-connection race conditions without artificial helper abstractions.
3. **Browser Governance & Valid Fixture Narrowing**:
   - Updated `skills/common/common-web-visual-testing/SKILL.md` and `references/login-and-test-data.md` to condition origin verification on state-changing forms (such as login), noting that standard browser GET navigations typically omit `Origin`.
   - Removed any implication of general CORS waivers for `null` origins or CSRF bypasses.
   - Explicitly preserved the valid narrower use cases of saved auth state (`local-auth.json` for post-login UI testing speedup) and renderer-only fixtures (jsdom for isolated component/layout tests) without allowing them to be claimed as full backend login/session governance proof.
4. **Hardened Eval Assertions (Decision Shapes & Refusal Discrimination)**:
   - Replaced ambiguous `contains_any`-only assertions in all six added eval cases across `common-security-standards`, `common-web-visual-testing`, and `common-telemetry` with finite decision contracts (`Decision: REJECT` / `Decision: NO`).
   - Added negative discrimination assertions (`not_contains`) to reject unsafe affirmative or compliant-sounding answers that concede the violation (e.g. rejecting "approved", "bypass is acceptable", "fetch() is sufficient", "satisfies governance", "$0.02 is accurate", "skills were used").
   - Required positive assertions for exact refusal rationale and structural requirements.
5. **Coordination with Task 5 Owner**:
   - Sent complete eval assertion contracts and IDs to Task 5 owner (`19dd21a9-1158-4f5e-9f3c-6d6be71e4e6a`) for calibration matrix testing.

### Updated Eval Case Matrix:

| Skill | Eval ID | Decision Contract | Refusal Discrimination (`not_contains`) | Positive Invariant Assertions |
|---|---|---|---|---|
| `common-security-standards` | 4 | `Decision: REJECT` | `"approved"` | `[reject, violation, unacceptable]`, `[operation-private, sibling]`, `[transaction, revalidate]`, `[race, provenance]` |
| `common-security-standards` | 5 | `Decision: REJECT` | `"bypass is acceptable"` | `[reject, cannot bypass, no bypass]`, `[parity, zero trust]`, `[audit, provenance]` |
| `common-web-visual-testing` | 3 | `Decision: REJECT` | `"fetch() is sufficient"` | `[reject, cannot replace, insufficient]`, `[native form, real browser]`, `[Origin, CSRF]`, `[populated, saved-auth]` |
| `common-web-visual-testing` | 4 | `Decision: NO` | `"satisfies governance"` | `[no, does not satisfy, insufficient]`, `[renderer-only, jsdom]`, `[governance, cookie]`, `[real browser, populated]` |
| `common-telemetry` | 3 | `Decision: REJECT` | `"$0.02 is accurate"` | `[reject, cannot coerce, never coerce]`, `[missing, unknown, unavailable]`, `[zero, 0]`, `[partial, lineage, slice]` |
| `common-telemetry` | 4 | `Decision: REJECT` | `"skills were used"` | `[reject, cannot report, do not conflate]`, `[discovery, catalog]`, `[body, fetch]`, `[usage, delivered, used]` |

**FINAL Freeze:** Source files are frozen. No further edits will be made until parent instructs.
