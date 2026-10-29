# Task 4 — Independent frozen corrective re-review, round 4

## Verdicts

- **Spec: APPROVE for the scoped static guidance/finite-field contract review.** R3.1, R3.2, R3.3 and the named replay/revoke-after-precheck coverage gap are addressed. Earlier F1/F2/F4/F5/N1/N2 dispositions remain addressed. This is not completion of parent calibration or host/runtime acceptance.
- **Quality/security: APPROVE for this bounded source scope, with nonblocking precision observations below.** No remaining confirmed Blocker/Major in the reviewed corrective contract. No runtime-security, scorer PASS, model efficacy, or savings claim.
- **Verification status: PENDING parent integrated calibration.** No tests/scorer/browser/DB/build/lint/formatters/generators/check commands executed in this round. No source edits, delegation, premium, profile switch or active Task5 review. Only this authorized report written.

## Scope, provenance and loaded rules

Read the complete cumulative `task-4-review-round-4.diff`, `task-4-route2-report.md:135-225` (§6), current changed Task4 sources, and actual scorer regex/aggregation branch. Compared against the already-read round-three report R3.1–R3.3 and its replay coverage gap. Contract remains Task4 brief and approved plan S05 guidance boundaries, not a new production auth/payment implementation.

Parent confirms **DeepSeek Route2** implementation provenance. The owner's §6 headings and final line call this “Route 3”; that label is report terminology, not evidence of an actual profile/provider switch. This reviewer made no profile change. The corrected source is frozen by parent assignment, not inferred solely from the worker's FINAL label.

Direct skills reused: `code-review`, `caveman-review`, `sdd-revision-bound-rereview`. MCP file standards refreshed. Compliance audit confirms loaded `common/common-code-review`, `common/common-security-audit`, `common/common-owasp`, `common/common-llm-security`, `common/common-feedback-reporter`, `common/common-session-retrospective`, `common/common-skill-creator`, `common/common-workflow-writing`; `code-review` workflow previously retrieved in this session. Generic product-management router warning identifies no specific applicable product-management skill for this bounded source review.

Evidence uses the observed source snapshots and exact lines, not a new digest receipt: security implementation `#11E4`, canonical `#DBC9`, remediation `#CD5C`, security evals `#BC0D`, browser evals `#AE4D`, telemetry evals `#597F`, cumulative diff `#8BFD`, owner report `#A631`, scorer `#CC6A`. These tool snapshot tags are not cryptographic hashes. No checksum/check command was run under this round's read-only/no-checks constraint; previous round digests must not be reused as current-source hashes.

## Round-three dispositions

### R3.1 — ADDRESSED: shared authorization serialization protocol

**Evidence:** `skills/common/common-security-standards/references/implementation.md:32-39,43-50,54-76`; security `SKILL.md:58,60`; remediation `references/VULNERABILITY_REMEDIATION.md:32`.

**Why:** The contract now requires a protected `authorization_state(tenant_id, account_id, revision)` domain row. All authorization-changing paths, explicitly including membership/role, session revoke/forced expiry, enrollment/ownership and privileged issuance, take that shared lock and bump the revision in the same transaction. The mutation writer acquires it before reading mutable membership/session/account facts and compares the capability revision. Lock order is defined: authority state → account/resource → unique operation consumption. The SQL shows authority-state lock acquisition before session/membership/account read, followed by unique consumption. Account-only locking is explicitly insufficient.

The previously failing timeline now has a stated serialization outcome:

1. If connection B's revocation commits before A obtains the shared lock, A observes the new revision/revoked state and aborts before mutation.
2. If A already holds that lock, B cannot commit the revocation ahead of A's authorization point; B waits and the changed revision applies to subsequent authorization points.
3. A second request with a previously consumed operation identity is independently rejected by the unique insert, even if authority remains valid and the account balance is sufficient.

This closes the contract gap that transaction placement/account locks alone did not address. The contract is expressly not a copy-ready module (`implementation.md:24`); host schema/auth-ingress implementation and real multi-connection proof remain external. A transaction label alone is no longer the safety argument.

### R3.2 — ADDRESSED: whole-response finite field grammar

**Evidence:** security `evals/evals.json:56-138`; browser `evals/evals.json:53-91`; telemetry `evals/evals.json:38-65`; scorer `scripts/evals/scorer.ts:195-200,252-266`.

**Why:** All fifteen contract scenarios now each carry one complete ordered anchored regex, rather than independent existential field assertions. Prompts explicitly require ordered enumerated fields and identify the optional final NOTES scope/bound. A safe block followed by a contradictory duplicate field, unknown field, code fence, or unlabelled non-whitespace tail cannot match the required full sequence and final anchor. Missing/unsafe required fields likewise cannot be rescued by unrelated positive vocabulary elsewhere.

For example, security case 5's regex (`72`) requires the entire ordered `REJECT / REQUIRED / REQUIRED / PERSISTED_TRUSTED_PROVENANCE` block. The round-three duplicate `AUTHENTICATION: SKIPPED` or trailing `DECISION: ALLOW` has no permitted position outside NOTES. The prior unsafe duplicate-field counterexample is therefore rejected by the written predicate, by static inspection—not an executed scorer result.

One substantive full-response assertion is sufficient for this finite grammar; no padding assertions are requested to satisfy an assertion-count heuristic. The owner's claim about manual/CI tooling behavior was not independently checked in this review; parent owns any actual gate result and authorized tooling reconciliation.

The grammar certifies field classification only. An explicitly ungraded one-line NOTES value can contradict the fields and still be accepted. That is the declared limit, not a concealed claim of whole-answer semantic enforcement. No natural-language semantic classifier, unsafe-word ban, or expected-output copying is required to close R3.2.

### R3.3 — ADDRESSED: complete token/lineage premises for telemetry positive

**Evidence:** `skills/common/common-telemetry/evals/evals.json:59-65` (complete prompt at `60` read without truncation).

**Why:** Case 5 now explicitly supplies measured complete prompt/completion/cache/reasoning token quantities across **all parent, worker and retry events**, applicable rates, and separately observed four-stage counters. Required fields include `TOKEN_INPUTS: COMPLETE` and `LINEAGE_SCOPE: FULL_TASK`; expected output explicitly says stage counts are usage evidence, not cost inputs. Exact estimated full-task token cost is now conditioned on complete quantities and rates rather than rates alone. Nothing here promotes an estimate to provider invoice data or claims net savings.

### Replay/revoke-after-precheck finite coverage gap — ADDRESSED

**Evidence:** security `evals/evals.json:132-138` (complete prompt at `133` read without truncation).

**Why:** New case 11 names the actual adverse timeline: A reads active revision 7; B revokes membership/session and commits revision 8; A resumes with an already-committed operation identity while the account lock is free. Its required classification includes all five relevant decisions: reject, current epoch 8, duplicate consumption rejected, shared authority-revision serialization, revoked session. Account-only locking, stale epoch, continued session or duplicate accepted is an unsafe enum and cannot satisfy the whole grammar.

The case combines two independent rejection conditions, but asserts both relevant classifications rather than scoring generic rejection alone. Parent calibration should independently mutate each field to ensure neither stale-authority nor replay acceptance hides behind the other valid rejection reason. No DB race or actual scorer execution occurred here.

## Original findings retained as addressed

| Finding | Current source evidence | Static disposition |
|---|---|---|
| F1 private privileged mint vs ordinary session | Security `SKILL.md:55`; implementation `28-30`; remediation `28`; security 4/6/10 (`56-83,122-127`) | Owner-private mint/no exported sibling gateway; ordinary sessions retain audience/expiry/revocation/current-authorization policy. No public-static mint example reintroduced. |
| F2 authenticated evidence != universal signature | Security `SKILL.md:57`; implementation `78-80` | Protected authoritative append-only store accepted; MAC/signature only for stated untrusted evidence boundary. Privileged capability signature in this example is not a universal session/log signing rule. |
| F3 fresh authority + same mutation transaction + concurrency/replay | Security `SKILL.md:58,60`; implementation `32-76`; security 11 | Shared lock/revision protocol added; unique consumption remains separate. Addressed as contract, not deployed proof. |
| F4 trusted persisted principal/operation evidence | Implementation `24,45-50,80`; security `SKILL.md:57` | Current host-verified principal/tenant, no caller-supplied audit claims, restricted same-transaction audit writer; protected storage integrity contract retained. No arbitrary typed-string signing example. |
| F5 native browser vs GET/header/CORS | Cumulative diff `446-448,553-561`; browser 3–6 (`53-91`) | Native state-changing form and populated real-browser proof; no Origin guarantee for ordinary GET, no CSRF/null-Origin CORS waiver; saved-auth/jsdom retain narrower legitimate use. |
| F6 finite actual scorer decision control | Fifteen whole-response regex cases listed below | Loose vocabulary/negated-substring bans replaced; complete fields/unsafe alternatives and legitimate positive scenarios explicit. Efficacy/calibration remains pending. |
| N1 fences | Implementation SQL `54-74`, headings `22,26,32,41,52,78`; prior TypeScript/Python blocks unchanged in cumulative diff | Balanced reviewed replacement block; no old unclosed transfer fence. No renderer run. |
| N2 unsafe transfer values/destination | Implementation `24,49` | Unsafe runnable-looking transfer removed; bounded host contract explicitly requires positive exact minor units and exactly one permitted same-tenant destination update. |

## Finite case coverage — all fifteen, no positive/negative scope dropped

| Package / ID | Decision | Named boundary |
|---|---|---|
| security 4 | REJECT | Shared ledger as privileged authority, sibling privileged reuse, writer-transaction validation, trusted audit principal; ordinary sessions explicitly separate. |
| security 5 | REJECT | Internal/batch bypass, required authentication/control parity and authenticated persisted audit. |
| security 6 | REJECT | Private constructor does not make exported public-static mint safe; owner-private issuer and key access. |
| security 7 | REJECT | Stale signed snapshot after restore, current authority/root authorization/revalidation. |
| security 8 | REJECT | Cross-enrollment retention, legacy/direct API bypass, membership checks. |
| security 9 | ALLOW | One-time root bootstrap, monotonic authority-log gap recovery, authenticated unexpired resume. |
| security 10 | ALLOW | Root-authorized restore then current revalidation; ordinary reusable sessions; privileged owner-private mint. |
| security 11 | REJECT | Revision 7→8 after precheck; membership/session revoke; second-connection duplicate operation; shared serialization, not account-only locking. |
| browser 3 | REJECT | fetch/custom headers/mock cookie is not full native-form/Origin/CSRF/populated-state proof. |
| browser 4 | REJECT | jsdom isolated component scope != full login/backend cookie governance. |
| browser 5 | ALLOW | Native real-browser form, strict Origin/CSRF, populated dashboard; saved-auth only later screens. |
| browser 6 | ALLOW | Legitimate GET navigation without Origin, populated DOM, strict null-Origin for state changes. |
| telemetry 3 | REJECT | Missing token counts != zero; partial worker slice != exact whole-task cost. |
| telemetry 4 | REJECT | Listing != body fetch/delivery/usage; unsupported usage remains withheld. |
| telemetry 5 | ALLOW | Complete measured token quantities and full-task parent/worker/retry lineage with rates; separate observed stage counters. |

Generic routing negatives remain in their pre-existing arrays. No claim that this case set establishes universal policy semantics, authenticates an actual session, or replaces external host capability/entitlement enforcement. The current Task4 write set stays within existing guidance/references/evals; no collector or new host API introduced.

## Actual-scorer static boundary assessment

The real scorer uses `new RegExp(value, "i").test(transcript)` without `m` or `s`, and reports a case passed when no assertion fails. The whole-response anchors therefore apply to the complete transcript; `\s*` deliberately consumes LF/CRLF and whitespace between fields. Both semantic versions reach the same regex branch.

These are **static predicate judgments only**, not executed PASS/FAIL receipts:

| Candidate shape | Predicate outcome by inspection |
|---|---|
| Required ordered safe fields using LF | Matches. |
| Same with CRLF, case changes, horizontal whitespace | Matches under `i` and `\s*`. |
| Required fields + permitted bounded NOTES containing a safe refusal/paraphrase/quoted unsafe claim | Matches; no isolated-word negation/quotation ban. |
| One omitted required field or one unsafe value substituted | Does not match full ordered grammar. |
| Keyword-only prose, field block wrapped in code fence | Does not match anchored grammar. |
| Correct block + duplicate unsafe field / unknown field / unlabelled non-whitespace tail outside NOTES | Does not match; closes R3.2. |
| Correct block + two nonempty LF/CRLF-separated NOTES prose lines | Does not match the single non-CR/LF NOTES body plus whitespace-only trailer. |
| Correct block + more than 300 non-whitespace NOTES body characters | Does not match the bounded body. |
| Correct block + permitted bounded unsafe NOTES | Matches by explicit scope; not evidence of whole-answer safety. |
| Any case11 stale/duplicate-accepted/account-only/continued-session substitution | Does not match required case11 fields. |

Freeform alternatives to enumerated field values are outside the declared output protocol; paraphrase/quoted-refusal controls belong in NOTES. One regex is not inherently weaker than several assertions: here it enforces the sequence and confines the ungraded channel.

## Nonblocking precision observations and implementation limits

1. **Whitespace tolerance, not strict line parsing.** The `\s*` separators permit blank lines and even zero-separator concatenation such as `REJECTCONTROL_PARITY:`. Thus “one line per field” is more restrictive prompt formatting than the actual grammar. This does not re-admit unknown/unsafe field values or non-whitespace tails; not a safety blocker for the stated field-classification purpose. Likewise trailing whitespace is not counted as NOTES prose. Do not describe the regex as enforcing exact newline placement or rejecting whitespace-only extra lines.
2. **SQL remains a contract fragment, not a complete tenant/auth adapter.** The shared lock query explicitly uses tenant/account (`implementation:57-59`); the following membership/session/account SELECT (`62-67`) does not repeat a tenant filter or fetch expiry. The surrounding mandatory predicate (`46`) still requires current tenant reachability and session expiry checking, and the host-owned schema/trust basis is explicitly a prerequisite (`24`). Approval is for that complete stated contract, not an assertion that pasting only the SELECT proves tenancy/expiry. An implementation must enforce the tenant-domain/account association, authorization-state key constraints and relevant fact checks, with explicit predicates or protected schema invariants; this review supplies no schema/runtime proof. No instruction in the contract permits omitting those requirements.
3. **Owner report provenance and tooling claims.** §6 “Route 3” wording conflicts with parent-confirmed Route2; preserve the parent provenance in integration evidence. Owner statements about assertion-count heuristics/CI behavior are not independently verified here; no padding or policy waiver is granted by this review.
4. **Ungraded NOTES is an explicit residual semantic limit.** A passing field classification with unsafe NOTES must not be relabeled a safe full answer. Task5/parent must retain the independently adjudicated expected result and scope, including adverse NOTES controls. No request to reject arbitrary natural-language contradictions or to add blanket phrase bans.

## Parent verification and acceptance boundary

Source-level review gates for the named corrections are satisfied. Parent still owns final calibration against these exact frozen canonical regexes and the real scorer: safe ordered fields, case/LF/CRLF, quoted-refusal NOTES, unsafe substitution, omission, duplicate/unknown fields, code fences, unlabelled tails, nonempty multiline/overlong NOTES, case11 per-field adverse controls, and legitimate lifecycle/browser/accounting positives. The permitted unsafe-NOTES result must remain labeled field-only, not semantic safety.

Do not run stale Task5 expectations and call their failure a Task4 runtime regression without comparing the current explicit protocol. This reviewer did not read or assess active Task5 source. Parent may await other eligible slice repairs before its settled integrated gate; that does not convert pending calibration to PASS here.

No human acceptance, host trust-basis verification, production auth/DB/browser behavior, model uplift, savings or original failing-before evidence is supplied. Original RED remains NOT RUN. Approval does not authorize activation, deployment, paid trials, profile changes or premium.

## Evidence and cost limits

Performed: dedicated file/diff reads, MCP rules/compliance lookup and static inspection of real scorer predicates. No tests, scorer execution, commands/checks/checksums, builds/lint/formatters, renderer/browser/DB, generators, models, or delegation in this round. Only this report authored; earlier reports/source left unchanged by this reviewer.

MCP `get_session_cost(workflow="code-review", model="openai-codex/gpt-6.1-sol")` returned **Partial — host usage or pricing fields missing**. Exact prompt/cache/completion/reasoning usage, other billed runtime cost and currency total are **unavailable**. MCP consultation counters span this continuing session and are not exact round-four token cost, whole-task totals or savings.
