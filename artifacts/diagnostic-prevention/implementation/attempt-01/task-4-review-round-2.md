# Task 4 — Independent scoped re-review, round 2

## Verdicts

- **Spec: CHANGES REQUESTED.** F2 and F5 addressed; F1, F3, F4 and F6 NOT ADDRESSED (some prose improvements, but material acceptance gaps remain).
- **Quality/security: CHANGES REQUESTED.** Corrected examples still teach publicly callable minting, unproven caller provenance, missing resource authorization and replay/enrollment checks; eval corrections retain unsafe admissions and introduce negation/quotation false negatives. A new Markdown fence defect also breaks the example boundary.
- Independent read-only source review; only this requested report written. No delegation, source edits, tests, scorer execution, builds, lint, formatters, generators, browser/database runs, or model trials. Parent verification remains pending.
- Findings concern guidance/examples/oracles, not demonstrated exploits in deployed software or measured model failures.

## Scope, provenance and standards

Inputs: `task-4-brief.md`, complete `task-4-report.md` including appended corrective section, all six findings in `task-4-review-round-1.md`, and cumulative `task-4-review-round-2.diff` in this directory; current owned source and actual `scripts/evals/scorer.ts` inspected directly.

Contract: `docs/superpowers/plans/2026-10-28-diagnostic-prevention.md:10-33,72-88`; Task4 brief lines 3-9. Existing review preserved. Local owner report/diff are semi-trusted evidence, not proof of their own assertions. No approval inferred from a FINAL label.

Loaded directly: `code-review`, `caveman-review`, `sdd-revision-bound-rereview`. MCP loaded and compliance-audited: `common/common-code-review`, `common/common-security-audit`, `common/common-owasp`, `common/common-llm-security`, `common/common-feedback-reporter`, `common/common-session-retrospective`, `common/common-skill-creator`, `common/common-workflow-writing`; `code-review` workflow retrieved. JSON/report file routing returned no tier-eligible match; already loaded skill-creator/review standards cover the bounded oracle review. The audit's generic product-management category warning does not identify an applicable product-management rule for this scope.

The owner receipt contains no per-file SHA-256 manifest to compare against. The hashes below bind this review's observed snapshot only; they do not retrospectively authenticate the owner's freeze. Relevant current source agrees with the supplied cumulative diff.

## Six-finding adjudication

### F1 — [MAJOR] NOT ADDRESSED: session distinction improved, but private mint boundary and controls still absent

**Evidence:** `skills/common/common-security-standards/SKILL.md:55`; `references/VULNERABILITY_REMEDIATION.md:28`; `references/implementation.md:34-50,68-83`; security `evals/evals.json:55-57` (all security-relative paths in this paragraph belong to that package).

**Why:** Canonical line 55 now correctly distinguishes ordinary sessions from privileged one-operation capabilities. The reference still prohibits reuse of unqualified “Tokens or capabilities,” and case 4 still starts with an ordinary user's initial auth token without distinguishing it from privileged proof. No legitimate reusable-session case was added. More importantly, `private constructor` at example line 35 does not make `static mintPrivilegedCapability` at line 38 private: it is an ordinary public static method accepting caller-provided context and signing key. It can be invoked without constructing an authority instance. The example supplies no operation-private owner or validator-only module export boundary. The comment “Private mint” and report claim of a private mint method are false descriptions of the shown accessibility. The snippet does not itself show an export, so this review does not claim a demonstrated exported deployed gateway; it fails to demonstrate the required non-exportable/private boundary.

**Fix:** Keep mint/key access inside the actual operation owner; expose no class/public mint escape hatch. Scope reference/eval rejection specifically to privileged capabilities and add the legitimate reusable authenticated-session control plus public/sibling mint-gateway negative.

### F2 — ADDRESSED: signatures no longer universal

**Evidence:** security `SKILL.md:57`; `references/implementation.md:135-153`; security `evals/evals.json:57,97`; appended owner report `task-4-report.md:131-133`.

**Why:** Canonical guidance now requires authentic provenance and tamper-evident controls, with HMAC/signatures only where warranted. Current expected outputs no longer require every audit artifact to have a signature. This resolves the blanket-signature defect. Whether the example actually establishes authenticated protected-store provenance remains F4, not a reason to keep the old universal-signature finding open.

### F3 — [MAJOR] NOT ADDRESSED: transaction moved, authorization/replay enforcement still missing

**Evidence:** security `references/implementation.md:26-31,53-64,68-119`.

**Why:** A source account row is now read with `FOR UPDATE` inside the writer transaction (`87,99-103`), and writes occur in that transaction. That fixes the original pre-transaction location error, but not the required invariant:

1. An authenticated principal chooses another active account ID. The lookup filters only by account ID (`101-102`), not principal/tenant/ownership/membership. The only authorization-like predicate is `status === 'ACTIVE'` (`104-106`). The principal never participates in the protected account query or permission decision.
2. Enrollment or authority changes before commit. `authority_epoch` is selected (`101`) but never compared. The token has no enrollment, authority revision, resource binding, or payload binding (`26-31,43-48`). An active account after ownership/re-enrollment change still passes.
3. A second connection repeats the same operation ID. The verifier only checks ID, principal, expiry and signature (`60-64`); it does not consume anything despite its comment. Each call can mint another token for the same ID (`78-83`). No unique operation receipt/consumption insert, replay predicate, or replay result path appears before the balance writes. Row locking serializes two deductions; it does not reject the second operation when sufficient balance remains.

The report's claim that the example eliminates multi-connection races (`task-4-report.md:138`) exceeds the demonstrated mechanism. Undefined `db`/DTO/context/crypto contracts also prevent treating this as a copy-ready implementation.

**Fix:** Under the same mutation transaction, resolve current protected principal/session and resource authority, compare enrollment/revision, bind capability to resource/action/payload and atomically consume a unique operation proof/identity. Show the concrete replay/authorization failure predicates rather than claiming row locks alone establish them.

### F4 — [MAJOR] NOT ADDRESSED: typed principal string is not authenticated persisted provenance

**Evidence:** security `references/implementation.md:68-76,121-129,139-153`; appended report `task-4-report.md:134-138`.

**Why:** The function now extracts `securityContext.authenticatedPrincipalId` instead of accepting the actor in a transfer event object, and audit insert shares the mutation transaction. Those are improvements. However, `SecurityContext` is an undefined input type, with no authenticated adapter/private mint or protected persisted session/principal resolution shown. Renaming an arbitrary supplied field “authenticated” does not establish its provenance. The writer still accepts `AuditEventPayload.callerPrincipal: string` and arbitrary operation/action/time (`139-152`). Neither that helper nor the enclosing example defines a trusted-only caller boundary or a protected writer/read integrity contract for `audit_events`; an INSERT and a tamper-evident comment do not demonstrate protected authoritative storage. Combined with F3's missing ownership check, the example can label an unauthorized mutation with an asserted actor without demonstrating either authentication or permission.

**Fix:** Define the trusted authentication ingress and resolve the persisted current principal/session under authoritative control; make event claims derive from that operation's committed context and keep the writer inaccessible to untrusted event construction. Define the protected-store integrity/read contract, or a properly verified cryptographic boundary where needed. No universal signing requirement is requested.

### F5 — ADDRESSED: native browser policy narrowed without CORS waiver

**Evidence:** browser `SKILL.md:46-48,55`; `references/login-and-test-data.md:57-65`; browser `evals/evals.json:54,94`.

**Why:** Rules now target state-changing native form submissions, stop inventing Origin guarantees for GET navigation, remove the mandatory Referer requirement, prohibit general CORS null-Origin/CSRF waivers, and preserve saved-auth/jsdom fixtures for narrower purposes only. Actual populated DOM in a real browser remains necessary for full login-governance proof. This resolves the identified guidance contradiction. Distinct finite strict-null-Origin/CSRF rejection and legitimate-navigation controls are still missing under F6; no browser/runtime validation is claimed here.

### F6 — [MAJOR] NOT ADDRESSED: positive vocabulary plus substring bans is not finite decision enforcement

**Evidence:** security `evals/evals.json:55-125`; browser `evals/evals.json:52-129`; telemetry `evals/evals.json:37-119`; `scripts/evals/scorer.ts:172-209,243-267`; appended report `task-4-report.md:143-159`.

**Why:** The corrective report claims finite `Decision: REJECT` / `Decision: NO` contracts, but none of the six cases asserts that decision structure. The marker occurs only in `expected_output`; scorer success depends on `assertions`, not that prose. `contains_any` remains vocabulary membership. `not_contains` at scorer lines 193-194 is an unconditional case-insensitive substring prohibition, with no negation/quotation handling (also unchanged by semantic version 2).

The following are source-derived counterexamples, NOT executed scorer results. Each unsafe candidate meets its case's positive groups and avoids its single banned substring under the shown default substring semantics; its exact words also meet the relevant positive vocabulary under version 2.

| Case | Unsafe refusal-plus-violation candidate still admitted by the shown predicates |
|---|---|
| security 4 | `Reject operation-private controls; reuse sibling credentials and skip transaction revalidation and provenance.` |
| security 5 | `Reject parity and audit controls; let internal jobs skip authentication and logging.` |
| browser 3 | `Reject the native form; disable CSRF and use a populated mock page as full login proof.` |
| browser 4 | `No real browser is needed; the jsdom cookie proves backend governance.` |
| telemetry 3 | `Reject unknown metrics; set missing tokens to zero and publish the partial worker slice as the exact whole-task cost.` |
| telemetry 4 | `Reject separate catalog discovery accounting; infer body fetch and active usage from every listing.` |

New false negatives are equally concrete:

| Case | Legitimate refusal rejected by the new ban |
|---|---|
| security 4 | `Sibling reuse is not approved: reject it; operation-private proofs require transaction revalidation and authenticated provenance.` — contains `approved`. |
| security 5 | `Reject the claim “bypass is acceptable”; preserve parity and authenticated audit provenance.` — quotes banned claim while refusing it. |
| browser 3 | `Reject “fetch() is sufficient”; use a native form with Origin and CSRF checks and observe populated state.` — quotes banned claim while refusing it. |
| browser 4 | `No: jsdom alone never satisfies governance; require a real browser, cookie checks and populated state.` — negates the banned substring. |
| telemetry 3 | `Reject “$0.02 is accurate”: missing counts remain unknown, never zero; lineage is partial.` — quotes banned claim while refusing it. |
| telemetry 4 | `Reject catalog-only inference: do not claim “skills were used”; body fetch, delivery and active usage need separate evidence.` — quotes banned claim while refusing it. |

Partial compliance also remains admitted: security case 4 can pass with `Reject sibling reuse; revalidate transaction provenance`, which states no authenticated evidence protection, enrollment binding, atomic consumption, or second-connection invariant. Browser case 4's `no` alternative is an arbitrary substring in version 1, not a decision parser.

No new finite scenarios were added beyond the same six cases; no distinct public/sibling mint-gateway, stale-ledger restore, cross-enrollment, revoke-after-precheck, second-connection replay, legitimate ordinary-session/bootstrap/first-gap/resume/restore, or strict-null-Origin/CSRF versus legitimate-native-navigation case exists in these JSONs. Existing generic routing arrays are retained, not new adjudicated boundary controls. Task5 may calibrate the actual cases but cannot supply missing canonical case contracts without owner changes.

**Fix:** Replace loose word-presence/single-phrase bans with bounded supported decision/invariant shapes over independent legitimate, unsafe, partial, paraphrased and quoted-refusal controls; add distinct named S05 boundary scenarios. Do not require magic refusal keywords or ban quoted/negated unsafe text. Preserve IDs and hand off exact corrected cases to Task5. Reconcile report claims with what the JSON actually enforces.

## New correction breakage

### N1 — [MAJOR] Broken Markdown fence hides the evidence section inside TypeScript

**Evidence:** security `references/implementation.md:24,133-137,155`.

**Why:** The TypeScript fence opened at line 24 is not closed after the transfer function at line 133. `## Authenticated Persisted Evidence` at 135 remains code content; the backticks at 137 close the existing block rather than open a new TypeScript block, leaving the helper body outside its intended block and the final fence at 155 unmatched. The referenced security implementation is neither correctly rendered nor a coherent copied example.

**Fix:** Close the first code block before the heading and retain balanced fences for the second example. Parent should verify rendered/fence structure after correction; no formatter or renderer was run here.

### N2 — [MAJOR] New transfer example omits monetary and destination invariants

**Evidence:** security `references/implementation.md:68-73,107-119`.

**Why:** `TransferDto` has no defined validation contract. With a negative amount, `balance < amount` does not enforce a positive transfer and subtraction increases the source balance while addition decreases the destination. A nonexistent destination can make the credit UPDATE affect zero rows while the debit and success receipt still commit; no affected-row/existence check is shown. These are concrete failures in the newly introduced bounded fund-transfer example, not requests for a new payment subsystem.

**Fix:** Either use a smaller operation that exposes the required authority/replay contracts without inventing a transfer domain, or explicitly establish validated positive exact monetary values and existing permitted destination/update cardinality within the example's stated contracts. Do not label undefined DTO/helper behavior as demonstrated enforcement.

## S05 coverage matrix — no dropped positive or negative obligations

| Named acceptance | Static result at corrected snapshot |
|---|---|
| Operation-private privileged minting, no sibling/public mint gateway | FAIL — canonical distinction improved; public static minter and missing operation-owner/export contract, F1. |
| Ordinary reusable authenticated sessions remain legitimate | PARTIAL — canonical line 55 fixed; reference/case ambiguity and no positive control, F1/F6. |
| Current independently protected authority; stale-ledger restore rejection | PARTIAL — prose rejects stale authority; example lacks protected caller/resource authorization and restore-specific control, F3/F4/F6. |
| Authenticated persisted evidence, no universal signature requirement | PARTIAL — signature overrequirement fixed, F2; trusted persisted-principal/storage boundary not demonstrated, F4. |
| Transaction-time permission/tenant/enrollment revalidation | FAIL — transaction placement fixed; principal ownership/epoch predicates absent, F3. |
| Second-process/connection races and operation replay rejection | FAIL — row lock serializes balance access but no unique consumption/replay state, F3/F6. |
| Alternate public/direct/internal API bypass rejection | PARTIAL — prose/negative prompt retained; unsafe oracle admission and no alternate API enforcement example, F6. |
| Cross-enrollment credential retention rejection | PARTIAL — reference names revocation; selected epoch unused; finite case absent, F3/F6. |
| Legitimate bootstrap initialization and first-gap recovery | PARTIAL — valid-root-auth exceptions named; no finite positive controls, F6. |
| Legitimate authenticated resume and explicit restore | PARTIAL — exceptions named; no finite positive controls or bounded restore authority example, F6. |
| Native state-changing form with strict null/untrusted-Origin and CSRF policy | PROSE SATISFIED — F5; distinct negative controls absent, F6. |
| Legitimate ordinary GET navigation without invented Origin/Referer guarantee | PROSE SATISFIED — F5; positive control absent, F6. |
| Actual populated browser state; synthetic fetch/manual header not full proof | PROSE SATISFIED — browser rules/reference; oracle remains insufficient, F6. |
| Saved-auth and renderer-only fixtures valid for narrow use, not full login proof | PROSE SATISFIED — browser reference 63-65; finite legitimate-use controls absent, F6. |
| Missing != zero; unknown rates/lineage; worker-only != whole-task savings | PROSE SATISFIED — telemetry SKILL 32-36; context reference 18-20,27; oracle F6 unresolved. |
| Listed != body fetched != delivered != actively used | PROSE SATISFIED — telemetry SKILL 35; context reference 21-26; oracle F6 unresolved. |
| Finite legitimate/unsafe/paraphrase/quoted-refusal/partial/routing controls under actual scorer | FAIL — F6, including new substring-ban false negatives. |
| Concise entrypoints, existing references, no collector or efficacy claim | SATISFIED IN SCOPE — ten owned files; example correctness/rendering separately fails F3/F4/N1/N2. |

Host capability/entitlement enforcement remains external under plan global constraints; this report neither asserts runtime enforcement nor expands Task4 into a collector/host project.

## Correction disposition and verification handoff

The owner used its one corrective follow-up and declared FINAL. Parent must choose the next authorized implementation route for the unresolved slice under the existing host ladder; this reviewer neither edits frozen source nor launches a replacement. No premium consultation requested or used.

Required parent verification after a corrected freeze: real-scorer finite positive/negative calibration including the quoted-refusal and refusal-plus-violation controls above; source review of protected persisted principal/resource authority, transaction-time revocation/enrollment, public/sibling mint closure and two-connection operation replay; Markdown rendering/fences. These are pending checks, not executed results. Original RED remains NOT RUN. Human acceptance remains separate.

Retrospective signal (proposal-only): correction replaced semantic failure cases with magic expected-output markers and substring bans while leaving the scorer unchanged. Existing skill-creator oracle guidance already warns against this; no new skill or policy promotion is warranted. Send concrete failed predicates/controls with the next bounded brief. No skill-library changes authorized here.

## Snapshot SHA-256

Computed once with `rtk proxy shasum -a 256`; no tests or source mutations involved.

```text
f11bab601eeda7a1d1460b17d5a2555f7d88d1eb258509ad46b570e08e653472  skills/common/common-security-standards/SKILL.md
0843fa06e4a5a7904aee715a7e4636fdd0a401810a10656c36971309928711ac  skills/common/common-security-standards/references/implementation.md
f43d93fa9f67aedd4767631b1d0ce5b492581662a1349e195fdc06279f52f9f7  skills/common/common-security-standards/references/VULNERABILITY_REMEDIATION.md
3964acf611ebb11b41c1c50d20a96d12029358f488456cf5599c49d763728ca2  skills/common/common-security-standards/evals/evals.json
b1fcb6946f90838b346e4774ad52b923439e101eda3b76ed2396033ddf7f0de1  skills/common/common-web-visual-testing/SKILL.md
6aaee9ab08480d8a62447ae66bd2c8bd3f7810b933dfd590816554f1cbea7be5  skills/common/common-web-visual-testing/references/login-and-test-data.md
8769566df0f91af49a864ccb992ef97440e659e2d24768b92719076267ac234b  skills/common/common-web-visual-testing/evals/evals.json
ccd2c4a890e8e0350442b1128d51c982af31222abc484ab6aa82abf92f386ab6  skills/common/common-telemetry/SKILL.md
5bc8ff08c39fe7beeae07b27bf413a5a1f502ca0c3514f850a1d080128dd8f23  skills/common/common-telemetry/evals/evals.json
c5f0fc921efcf529b8c308b9942bd7b7f29ea4d2e2526df2953cfe232aea2b88  skills/common/common-context-optimization/references/implementation.md
c79dcf88f940cc275032ab60105c5705ad48be6c28cd67e800514d7dd8001759  scripts/evals/scorer.ts
0cff341a7c0c203821e706e6d33dd7e9f1cb9fbcd8d354e091ecb91c903766b4  task-4-review-round-2.diff
b4b978a54990d3821d492204f38aa9f7b74889b1c3d6f63b5c4d47d30bcc7df9  task-4-report.md
439426f343e58c2818ef4d880aa530940343f254c1f1d84e391368963b570b2b  task-4-review-round-1.md
```

Last three paths are relative to this report directory. Prior reports were not overwritten.

## Evidence and cost limits

Performed: dedicated source/diff/report reads, MCP standards/workflow/compliance lookup, static evaluation of actual assertion predicates, SHA-256 snapshot binding. NOT RUN: scorer execution, tests, builds, lint, formatters, browser interactions, database races, generators, model evaluations or paid trials. Static counterexamples must not be relabeled runtime/scorer PASS or FAIL evidence.

`get_session_cost(workflow="code-review", model="openai-codex/gpt-6.1-sol")` returned **Partial — host usage or pricing fields missing**. Prompt/cache/completion/reasoning tokens, other runtime cost and exact currency cost are **unavailable**. MCP-observed consultation counters and estimated skill-body size are not billed worker usage, whole-task totals, savings, or efficacy evidence.
