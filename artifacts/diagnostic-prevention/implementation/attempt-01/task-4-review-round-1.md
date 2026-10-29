# Task 4 — Independent spec and quality/security review, round 1

## Verdicts

- **Spec: CHANGES REQUESTED.** Accounting prose and synthetic-browser proof limits satisfy their intended guidance scope; security capability scope, native-navigation requirements, concrete boundary examples and finite evaluator controls do not yet satisfy all S05 acceptance.
- **Quality/security: CHANGES REQUESTED.** Six MAJOR findings below. These are defects in guidance/examples/oracles, not claims of exploitable deployed runtime code or measured model failure.
- Review mode: independent, read-only except this requested report; no implementation edits, delegation, tests, builds, lint, formatters, generators, deployment, or paid model trials.
- Trust class: semi-trusted local owner-produced report/diff; assertions in the worker report were checked against changed source, not accepted as proof.

## Inputs and standards

Read `task-4-brief.md`, `task-4-report.md`, `task-4-review-round-1.diff` in this directory. Captured diff names base `52ac482a5b948d9d26df4c3a2617afec74d1cf54` and cumulative workspace changes in the ten owned source files. Review findings use current source line numbers; the captured diff and inspected source agree on the relevant changes.

Authoritative contract: `docs/superpowers/plans/2026-10-28-diagnostic-prevention.md:10-33,72-88`; immutable external spec `/Users/nguyenhuyhoang/OtherProjects/agent-skills-standard/docs/superpowers/specs/2026-10-28-diagnostic-improvement-plan.md:127-133,180-185`. The external document still labels itself PROPOSED; implementation approval is supplied by the approved execution plan/parent assignment, not inferred from that status.

Loaded standards: `code-review`, `caveman-review` via skill reads; MCP `common/common-code-review`, `common/common-security-audit`, `common/common-owasp`, `common/common-llm-security`, `common/common-feedback-reporter`, `common/common-session-retrospective`, `common/common-skill-creator`, `common/common-workflow-writing`. MCP compliance audit completed; its generic product-management category warning does not identify a matching product-management skill for this bounded security-guidance review.

## Findings

### F1 — [MAJOR] Operation-private privileged capabilities are generalized to reusable session credentials

**Evidence:** `skills/common/common-security-standards/SKILL.md:55,61`; `references/VULNERABILITY_REMEDIATION.md:28` in that package; security `evals/evals.json:56-57`; worker report lines 25,35.

**Why:** S05 addresses private authority/capability minting, including restore/seal and sibling-file mint gateways. The new canonical rule instead prohibits reuse of all session tokens and authorization credentials between operations. A legitimate authenticated session authorizing multiple separately checked requests is not the same as a reusable privileged operation capability. The generic fund-transfer eval cannot distinguish the two, and its expected answer trains blanket rejection. Merely naming authenticated resume as an exception does not repair the ordinary-session contradiction or prohibit a sibling/public module from minting the privileged capability.

**Fix:** Scope operation-private minting/non-exportability to privileged operation capabilities/proofs, bind them to the intended operation/resource/enrollment and private owner, and keep ordinary reusable authentication/session credentials subject to their own audience/expiry/revocation/current-authorization policy. Replace the generic token-reuse scenario with the actual public/sibling mint gateway and add a legitimate reusable-session control.

### F2 — [MAJOR] Authenticated persisted evidence is narrowed to mandatory cryptographic signatures

**Evidence:** `skills/common/common-security-standards/SKILL.md:57`; security `evals/evals.json:57`; worker report lines 27,32.

**Why:** The spec requires independently trustworthy, authenticated persisted evidence, not per-record signatures for every audit log or security artifact. A protected authoritative datastore with authenticated writers/readers and integrity controls can meet the applicable threat model without a signature field. Conversely a signature over untrusted claims does not establish caller provenance. The blanket instruction to reject every unsigned record excludes valid protected-store designs and obscures the actual trust boundary.

**Fix:** Require authenticated provenance and integrity relative to an explicit threat model. Accept appropriately protected authoritative storage; require MAC/signature verification where evidence crosses an untrusted persistence/transport boundary. State issuer/key protection, verification and revision/enrollment freshness requirements for that cryptographic case. Reconcile the eval expected output and worker report with the corrected scope.

### F3 — [MAJOR] The transaction example revalidates before the transaction and hides all race/replay enforcement

**Evidence:** `skills/common/common-security-standards/references/implementation.md:31-51`.

**Why:** `revalidateAuthority` completes at lines 32-38; minting follows, then `db.transaction` begins at line 49. Revocation, account ownership/enrollment change, or competing state mutation can occur between the check and the commit. No authoritative version read/lock/CAS is shown inside the transaction. A generic transaction wrapper does not prove second-connection serialization, single-use proof consumption, operation binding, or prevention of replay; all of that is delegated to an undefined `executeTransfer`. The comment claims stronger protection than the example demonstrates. This contradicts the transaction-time revalidation invariant and the requirement that examples enforce rather than merely name controls.

**Fix:** Show the actual protected authority/state read and version/enrollment checks under the mutation transaction or an equivalent atomic commit predicate; show atomic operation-proof validation/consumption with unique operation identity and failure on stale version/replay. Keep capability minting private. Use a real bounded example with defined contracts rather than naming an opaque security method as the entire enforcement step. Parent verification should include revoke/change-after-precheck and two-connection replay controls.

### F4 — [MAJOR] The audit example signs caller-supplied identity rather than establishing authenticated provenance

**Evidence:** `skills/common/common-security-standards/references/implementation.md:59-74`.

**Why:** `recordAuditEvent` accepts `callerPrincipal`, `operationId`, action and timestamp from its `event` argument and signs that object. No authenticated principal or committed operation is used to derive/verify those claims. A caller can supply another principal and receive a valid signature over the false attribution. The example also supplies no read-side verification/freshness/enrollment binding, so the signature field alone does not establish the persisted-evidence invariant. Signing APIs/key contracts are undefined; this is a schematic call, not copy-ready enforcement.

**Fix:** Derive actor and operation metadata from the operation's authenticated authoritative context, not arbitrary event fields; persist it with the committed operation or an appropriately reliable audit mechanism. If cryptographic evidence is needed, define canonical signed claims/key identity and demonstrate verification against protected current authority and enrollment/version before use. Otherwise demonstrate protected authoritative-store provenance without implying signatures are universally required.

### F5 — [MAJOR] Native browser guidance requires headers that normal navigation may omit and adds an unsafe CORS exception

**Evidence:** `skills/common/common-web-visual-testing/SKILL.md:46`; `references/login-and-test-data.md:57-60`; browser `evals/evals.json:54`.

**Why:** The text requires real form submissions and navigations to carry both `Origin` and `Referer`, then rejects missing/null/untrusted origins unless cross-origin CORS-whitelisted. Normal same-origin GET/HEAD navigation can omit Origin, and referrer policy can omit Referer. This can falsely reject legitimate real-browser login landing navigation. A CORS allowlist is not authorization to waive the protected login/state-changing route's null-Origin or CSRF policy. The spec requires real form login to succeed *without weakening* null-Origin/CSRF rejection, not blanket Origin requirements for all navigation or a CORS-based exemption.

**Fix:** Specify route/method/browser-context requirements: exercise the native protected form submission with browser-generated request semantics and strict configured null/untrusted-Origin and CSRF rejection; separately drive ordinary navigation and assert actual populated state without inventing header guarantees. Treat CORS policy separately, not as a bypass for these checks. Preserve saved state for already-authenticated UI setup, while withholding full login-governance credit from it. Update expected outputs to match.

**Protocol source:** [MDN Origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin), read during review: same-origin requests generally receive Origin except GET/HEAD; documented exceptions/referrer policies can further affect emission. No browser run was performed.

### F6 — [MAJOR] New scenario evals accept unsafe affirmative/partial answers; required boundary controls are missing

**Evidence:** security `evals/evals.json:55-105`; browser `evals/evals.json:52-111`; telemetry `evals/evals.json:37-97`. Actual scorer `scripts/evals/scorer.ts:172-209,243-267` checks positive `contains_any` vocabulary and sets `passed` when no assertion fails; expected prose is not semantic enforcement.

**Why:** All six new cases use only positive vocabulary groups. They do not require a reject/withhold decision, its scope, the safety-preserving alternative, or relevant invariants. Expected outputs cannot compensate. The following unsafe candidates satisfy every listed assertion for the named case by static inspection of real scorer logic:

| Case | Unsafe candidate admitted by current assertions |
|---|---|
| security 4 | `Reuse sibling credentials; do not revalidate before the transaction.` |
| security 5 | `Bypass authentication and audit logging on the internal API.` |
| browser 3 | `Use a synthetic bypass instead of a native form; disable CSRF.` |
| browser 4 | `The jsdom fixture proves backend cookie governance; skip Origin checks.` |
| telemetry 3 | `Set missing prompt tokens to 0 and report the partial worker scope as the exact full-task cost.` |
| telemetry 4 | `All listed skills had their body fetched and were used.` |

A partial security answer such as `Reject sibling reuse and revalidate before a transaction` also satisfies case 4 while omitting authenticated evidence, actual in-transaction validation, cross-enrollment behavior and concurrency enforcement. The new scenarios do not exercise stale-ledger restore, public/sibling-file mint authority, cross-enrollment retention, legitimate first-gap/bootstrap/resume/restore, actual second-connection races, or required strict null-Origin/CSRF negatives as distinct adjudicated controls. Naming exceptions in prose is not a positive control. Task4 report's case table describes rejection controls that the JSON does not implement.

**Fix:** Define finite explicit decision-shape/invariant assertions supported by the real scorer, then coordinate Task5's independent positive/negative controls over the actual JSON. Include safe paraphrases and refusals quoting unsafe text, unsafe keyword stuffing/refusal-plus-violation, partial compliance, legitimate lifecycle/reusable-session cases and routing negatives. Add finite cases for the omitted named S05 boundaries. Do not fix by banning isolated unsafe words (that rejects valid quoted refusals), copying expected answers, or adding source-text tests. Maintain existing IDs. Revise the report to distinguish scenario intent from demonstrated rejection.

**Verification limit:** These are source-derived counterexamples, NOT executed scorer outcomes. Per assignment, tests/commands were not run. `scripts/evals/diagnostic-prevention.test.ts` was absent when inspected; Task5 remains separately owned/active, so this is not a finding against its unfinished implementation. Task5 cannot make these current canonical assertions reject the shown answers without owner correction.

## S05/Task4 acceptance matrix

| Acceptance | Static review result |
|---|---|
| Operation-private privileged minting; protected current authority | NEEDS CORRECTION — F1/F3; private minter/public gateway boundary not concretely enforced. |
| Authenticated persisted evidence | NEEDS CORRECTION — F2/F4; signatures both overrequired and insufficiently bound. |
| Transaction-time revalidation; second-process/connection races | NEEDS CORRECTION — F3; generic transaction/row-lock prose is not the missing atomic validation. |
| Alternate public API/direct bypass rejection | PARTIAL — canonical parity rule and scenario exist; affirmative bypass passes oracle (F6). |
| Stale-ledger restore/sibling-file gateway/cross-enrollment rejection | PARTIAL — lifecycle labels exist; restore/gateway-specific failures and enrollment invalidation controls are omitted (F1/F6). |
| Legitimate bootstrap/first-gap/resume/restore continue | PARTIAL — exceptions named, not bounded/qualified by finite positive controls; universal token prohibition conflicts with ordinary session reuse. |
| Native form login and actual populated states, strict null-Origin/CSRF | NEEDS CORRECTION — populated/synthetic-proof guidance is sound; header/CORS rule fails F5 and decision oracle fails F6. |
| fetch/manual headers/saved auth/renderer fixtures not full governance proof | SATISFIED AS PROSE — reference allows saved state for speedup but not full login proof; no runtime efficacy claimed. |
| Missing differs from zero; partial rates/lineage; worker vs full-task costs | SATISFIED AS PROSE — telemetry SKILL:32-36 and context reference:18-27. Current evals cannot establish compliance (F6). |
| Listed/body fetched/delivered/used remain separate | SATISFIED AS PROSE — all four states explicit; usage withheld without evidence. Current eval fails F6. |
| Finite scenarios with supporting positive/negative real-scorer controls | NOT SATISFIED — F6; schema-compatible positive word checks are insufficient. |
| Concise entrypoints, existing references, no new collector/runtime claims | SATISFIED IN REVIEWED DIFF — details in existing references; ten source files stay inside the assigned write set. |

The broader S05 platform-capability/entitlement/runtime-proof obligation is not implemented by these four package edits; plan/global constraints leave relevant host/runtime work external. This report does not silently mark that host-dependent obligation complete or demand a new Task4 collector.

## Minimal correction and verification handoff

1. Correct private-capability versus session scope and threat-model evidence wording in canonical/reference/eval prose.
2. Replace the security examples with explicit authoritative-context, atomic mutation/revalidation and evidence-provenance boundaries; preserve legitimate lifecycle paths.
3. Correct conditional native request/header guidance with no null-Origin/CSRF relaxation.
4. Extend canonical finite cases/shape assertions; send final IDs to Task5 for independent calibration. Retain failed candidates and both decision polarities; no source-text tests.
5. Parent runs settled real-scorer gates and verifies final source after correction freeze; this review supplies no test PASS, RED, runtime-security, model-uplift, or savings claim.

No implementation changes made. Parent still owns metadata/mirrors/changelog/integrated verification.

## Evidence and cost limits

- Performed: dedicated file reads, scoped literal searches, MCP standards/compliance calls, protocol-source read and static scorer evaluation.
- NOT RUN: tests, scorer execution, builds, lint, formatters, browser login/native navigation, concurrent database operations, generators, model trials.
- Discovery helper returned an explicit provider-credit failure; literal search located the plan. No missing-plan inference was drawn from the failed search.
- MCP cost call returned `Partial - host usage or pricing fields missing`; prompt/completion/cache/reasoning token counts and exact currency cost are **unavailable**. MCP consultation counts and skill-body estimates are not this worker's billed usage or whole-task cost/savings.
