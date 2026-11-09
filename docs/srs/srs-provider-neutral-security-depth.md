# Technical Design (SRS/FRS): Provider-Neutral Security Teaching Depth

Status: approved technical design for implementation-readiness
slug: provider-neutral-security-depth
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
delivery_mode: extended
plan_approval: approved(requesting operator, 2026-11-07)
design_approval: approved(requesting operator, 2026-11-07)
repository_status: design_artifacts_only
activation_status: not_required

## Decision Brief

- **Changes since approved PRD:** Select package-local native ESM functions and JSON data, a twenty-case synthetic permissions matrix, explicit pure next-state semantics, and a native Node test entrypoint. No product-scope change, lab action, new adapter or evidence schema.
- **Recommendation:** Keep instruction, synthetic examples and oracle artifacts under the existing offline owner. Give the verifier a separate test file and the independent reviewer policy/semantic acceptance. Do not build an executor or extend the dormant lab package.
- **Impact if wrong:** A circular oracle could certify the same policy error as the code; a denial could disclose data; a fixed example could deny legitimate access; synthetic results could be misrepresented as deployed-system proof.
- **Evidence:** Existing offline/evidence owners, F02 limits and historical CLV approval were already inspected. Native `.mjs` test/resource patterns exist. This design is not implemented, tested, independently accepted or activated.
- **Design approval:** Requesting operator replied `Ok` on 2026-11-07 to approve this presented technical design and readiness review only. Independent oracle acceptance, implementation execution approach, eligible worker assignment and official checks remain separate prerequisites. No coding, provider trials, publication or activation consent was granted.
- **Independently ready:** Readiness review can use this approved design; no missing host proof blocks offline preparation. Coding remains gated by the dispatch prerequisites.

## Trace Source

Original request: investigate Claude-Red for useful agent-skills-standard lessons and provider usability. The operator confirmed the no-bypass interpretation and approved the [BRD](../brd/brd-provider-neutral-security-depth.md). The operator's latest `Ok` approves the [presented PRD](../prd/prd-provider-neutral-security-depth.md) and technical-design-only progression on 2026-11-07.

Approved PRD content after recording approval: SHA-256 `4e2e5cb514b8404be99919a16e2ab5b629fdf0395a7e79fc746d917a21b36362`, observed with `rtk proxy shasum -a 256 docs/prd/prd-provider-neutral-security-depth.md`. This identifies the exact source bytes, not a Git commit, human signature or runtime grant. Scope owner: requesting operator / repository maintainer acting as Product Owner. Source IDs: BRD-OBJ-001; REQ-001..004; AC-001..013. No PRD criteria are redefined here.

Retain ADR-012, ADR-018 and [ADR-019](../../ARCHITECTURE.md#adr-019-governed-cybersecurity-lab-validation-boundary-adr-clv-01). Historical approved boundary: `92d06c420:docs/srs/srs-task-list-governed-cybersecurity.md` and `92d06c420:docs/srs/srs-cyber-lab-validation.md`; dated G2 decision leaves G3/G4/G5 pending and the offline owner unchanged. This design does not amend that authority.

## Architecture And Contract Delta

Audience: recipe author, verifier, independent security reviewer and integrator. Lifecycle: proposed; no implementation or runtime evidence. Communication is synchronous local function calls and read-only artifact consumption; no service, queue, database or network interface.

| HLD | Requirements traced | Component / owner | Contract / dependency direction | Failure domain |
| --- | --- | --- | --- | --- |
| HLD-001 | REQ-001/002/003 | CMP-RECIPE / scoped-validation Author | SKILL.md → recipe → LLD-REVIEW and supplied artifacts | Incorrect reasoning or authority claim; reject semantic review |
| HLD-002 | REQ-002/004 | CMP-EXAMPLE / Author; CMP-ORACLE / independent Reviewer | LLD-POLICY is reviewed before grading; functions implement LLD-EXAMPLE without importing expected cases | Policy ambiguity or mismatch; fail affected example, not invent verdict |
| HLD-003 | REQ-004 | CMP-CHECK / Verifier | Native test imports functions and reads frozen oracle; LLD-CHECK compares literal expectations | Missing case, mismatch or mutation fails nonzero |
| HLD-004 | REQ-004 | CMP-PACKAGE / Integrator | Existing registry sync/resource discovery; LLD-PACKAGE | Resource/check failure blocks source acceptance; no direct mirror patch |

One implementation owner per file. Reviewer may propose changes but cannot silently edit author-owned examples or approve their own implementation. Integrator coordinates revisions and alone owns shared docs/changelog or generated changes. No CLI/eval/generator architecture change is needed.

### Exact proposed artifact ownership

These are future files, not delivered implementations:

| Path | Owner and role |
| --- | --- |
| `skills/cybersecurity/cyber-scoped-validation/references/offline-access-control-worked-recipe.md` | Author: worked analysis, provenance, task envelope, semantic cases |
| `skills/cybersecurity/cyber-scoped-validation/scripts/offline-access-control-fixture.mjs` | Author: two pure functions only |
| `skills/cybersecurity/cyber-scoped-validation/assets/offline-access-control-matrix.json` | Author holds write ownership; Reviewer approves independent policy/cases before grading; changes invalidate acceptance |
| `skills/cybersecurity/cyber-scoped-validation/SKILL.md` | Author: compact Structure/References discovery additions only; preserve prohibitions/triggers |
| `scripts/skill-tests/provider-neutral-security-depth/access-control.test.mjs` | Verifier: native Node test, no duplicated example or oracle |

Keep lab fixtures, shared finding schemas, workflow routing, skill identity and category metadata format unchanged. Do not add broad triggers. Existing resource prefixes cover `references/`, `scripts/`, `assets/` and required root attribution. Ordinary release/publication changes require separately approved integrator scope.

## Selected LLD Contracts

### LLD-POLICY: Synthetic policy and independent oracle

Teaching domain only: trusted principals `AV`, `AE`, `BV`, `BE` have immutable `(tenantId, role)` values `(A,viewer)`, `(A,editor)`, `(B,viewer)`, `(B,editor)`. Resources are `rA={id:rA,tenantId:A,value:A0}` and `rB={id:rB,tenantId:B,value:B0}`. IDs are globally unique in this fixture. Supported actions are `read` and `update`; only `value` may change, to `A1` or `B1`. There is no public resource, admin role, sharing, tenant reassignment or cross-tenant exception.

Policy precedence:
- P1: tenant mismatch denies either action.
- P2: same tenant viewer permits read and denies update.
- P3: same tenant editor permits read and update.

Trusted identity/tenancy comes from supplied principal fixtures, not a request claim. A request's optional `claimedRole` is untrusted; it grants no authority. Do not imply these fixtures implement authentication or real server identity provenance.

The sixteen normative base expectations are fixed below; each cell becomes a unique `<principal>-<resource>-<action>` case. Six allow and ten deny is a cross-check, not the completeness oracle.

| Principal | rA read | rA update | rB read | rB update |
| --- | --- | --- | --- | --- |
| AV | allow P2 | deny P2 | deny P1 | deny P1 |
| AE | allow P3 | allow P3 | deny P1 | deny P1 |
| BV | deny P1 | deny P1 | allow P2 | deny P2 |
| BE | deny P1 | deny P1 | allow P3 | allow P3 |

Four additional cases: `AV-rA-update-claimed-editor`, `AV-rB-update-claimed-editor`, `BV-rA-update-claimed-editor`, `BV-rB-update-claimed-editor`. Each differs only by untrusted `claimedRole=editor`; all normatively deny. Thus the required inventory is twenty named cases, not whichever rows happen to remain in a JSON file.

Matrix JSON contains `policyRevision`, `principals`, `initialResources`, `expectedStates` and `cases`. `expectedStates` contains independently authored literal S0 (unchanged), SA (only rA.value=A1), SB (only rB.value=B1). Each case names `caseId`, `policyRow`, trusted `principalId`, untrusted `request`, `expectedFixed`, `expectedVulnerable` and `rationale`. Each expected object contains a literal `response` and `stateRef` resolving one of the three literal states. No expected verdict or state is generated by calling either implementation or a shared policy helper.

Reviewer freezes policy/rationale, required IDs, literal outputs/states and input identity before grading. Record artifact paths/digests, reviewer identity distinct from author, date actually observed, ambiguity disposition and approval evidence reference in existing evidence/adjudication carriers. This SRS and scout advice are **not** that independent acceptance. No fabricated reviewer, date, hash or approval value in examples.

### LLD-EXAMPLE: Pure function interface

File exports exactly `evaluateVulnerableAccess({ principal, request, resources })` and `evaluateFixedAccess({ principal, request, resources })`. Both are synchronous native ESM, with no CLI/main function or top-level execution, no import with effects, no I/O, clocks, randomness, environment access, logging, subprocess or networking.

Input domain: a complete trusted principal fixture, valid `read` or `update` request naming an existing resource, and declared unique synthetic resources. Update requests carry a literal `value`. The twenty cases remain inside this deliberately small domain; this is not a reusable production authorization API. The harness rejects malformed or unresolved fixture references before calls rather than inventing a policy verdict for bad test data. Missing policy/ownership/enforcement evidence belongs to LLD-REVIEW uncertainty cases, not a fabricated permission row. No undocumented domain expansion is permitted during implementation.

Return value is `{ response, nextResources }`, where caller-visible `response` is exactly one of:
- allow: `{ verdict: 'allow', resource: { id, tenantId, value }, error: null }`;
- deny: `{ verdict: 'deny', resource: null, error: 'access-denied' }`.

`nextResources` is **internal harness state**, never part of a returned API response or exported security report. It may contain the full synthetic state even when `response` denies. This distinction prevents a contradictory requirement to return state while forbidding disclosure. Denial response contains no restricted resource in any field. Allowed response identifies the exact target with its expected full value; returned objects do not alias mutable input objects.

A read leaves nextResources equal to S0. An allowed update changes only the target value in returned nextResources and returns that updated resource; all IDs, tenancy, unrelated resources and inputs remain unchanged. A denied update returns S0. Every call leaves principal/request/resources unchanged. Each case starts from a fresh equal initial state; outcomes cannot depend on case ordering or earlier writes.

Deliberately vulnerable characterization: omit tenant matching, use `request.claimedRole` when present instead of trusted role, allow read for viewer/editor and update for effective editor. Consequently all eight base reads allow; the four editor updates allow; four viewer updates deny; all four claimed-editor update variants allow. These are defective observed-to-be-characterized outputs, **not** normative permissions. The recipe explains missing object-tenancy enforcement separately from untrusted action authority.

Fixed characterization: enforce P1 first and trusted P2/P3 only, ignoring claimedRole for authority. It must preserve permitted reads/editor updates, not fix the example by denying everything. Native functions demonstrate synthetic source/data behavior, not deployed authentication, concurrency, database policy or API enforcement. No operational requests or exploit commands are added.

### LLD-REVIEW: Recipe, semantic cases and evidence

Demand-loaded recipe links the source module, matrix, existing validation record and shared evidence record using resolving relative Markdown links. It includes a compact pinned-upstream disposition table from the BRD, current canonical owners, CVE counterevidence, and copying/license consequences. Prefer original prose and fixtures; no unreviewed upstream code/payload or misleading expertise claims.

Semantic packets, separate from executable matrix cases:
1. Complete policy plus vulnerable source: cite the exact policy/case and causal missing/misbound check, not ID predictability or an HTTP code.
2. Complete policy plus fixed source: allowed same-tenant read/editor update is a negative control; do not invent a finding or assert global safety.
3. Three incomplete packets separately omit applicable policy, authoritative resource ownership or decisive enforcement context. Identify that precise missing fact and qualify certainty using existing evidence rules. Do not infer absence from failed reproduction.
4. Supplied corroboration plus blocked active retest/refusal: retain justified supplied finding status, identify blocked step and limits, continue independent offline remediation; no retry laundering, provider substitution or invented action receipt.

Task envelope records truthful authorization scope, exact supplied artifacts, permitted offline reasoning, excluded effects and requested finding/fix/retest output. It contains no policy override, guaranteed acceptance claim or assertion that a lab label grants permission. Reuse the existing evidence fields/status enums and `independent_ground_truth_ref`; do not introduce another security report/schema. Hypothetical expected results are labeled as such, never assigned invented observed timestamps.

### LLD-CHECK: Native verification entrypoint

After approved implementation: `rtk node --test scripts/skill-tests/provider-neutral-security-depth/access-control.test.mjs`.

Test uses `node:test`, `node:assert/strict`, named relative ESM imports and `JSON.parse(readFileSync(new URL(..., import.meta.url), 'utf8'))` for this exact declared JSON file. No JSON import-attribute compatibility assumption, TypeScript loader, external dependency, caller-selected file path, subprocess or service. Filesystem reads occur in the harness, not the pure functions, and are limited to supplied repository artifacts.

Check independently frozen required case-ID set equality, uniqueness and policy/state references before iteration. Resolve literal expected response/state and compare complete actual results from both functions; compare deep input snapshots before/after and assert no response/input alias. No oracle derived from outputs, label-only assertions, snapshot regeneration from implementation or bare count-as-completeness. Missing/duplicate/unexpected cases, unresolved references, mismatched verdict/resource/state, input mutation or allowed-access regression fail nonzero. A malformed corpus is infrastructure/test-input failure, not a policy denial or successful negative control.

Before the fixed implementation exists, expected failing assertions document the plausible authorization regression; do not fabricate RED by deleting guards or failing imports. The flawed example is intentionally characterized and may pass its characterization checks while violating the normative policy; report that distinction explicitly. Once author/verifier edits settle, run the actual entrypoint and retain row-level results, source/oracle digests and limitations. Existing root test globs do not automatically include the proposed feature directory; the explicit command is required unless approved integration adds it later.

### LLD-PACKAGE: Discovery, publication and provenance

One owner SKILL.md discovery link plus Structure entry; resources remain package-local. CLI package sync and generated mirrors already support these prefixes. Do not edit mirrors as another source of truth or change workflow/provider adapters.

Tool distinction: `cli/src/services/SkillDiscoveryService.ts:58-71` filters changed files to SKILL.md, whereas `scripts/evals/changed-skills.ts:8-40` maps reference/script/asset changes to their authentic owner. The PRD changed-only warning applies to the former, not the eval helper. Neither proves matrix semantics or actual consumer discovery. Planned registry integration uses `rtk pnpm --filter ./cli validate:all`, `rtk pnpm audit:skills`, `rtk pnpm audit:injection` with resource-link review; use focused additional checks only if those contracts change.

Previous official audit failed before running because this checkout lacks node_modules/tsx. That observation remains authoritative; do not rerun unchanged or claim PASS. Native Node checks can exercise the future pure example without those dependencies, but cannot replace the official registry/outcome validators. Dependency provisioning and any later official checks must be reported explicitly.

Publication remains out of scope. If separately commissioned, integrator uses existing generation/package parity and real temporary-consumer discovery; source validation alone never supplies that evidence. Record source-ready, publication, acceptance and activation states separately. Historical results remain immutable.

## Technical Requirement Cards

The authoritative verification mapping for each technical requirement appears only here. VER identifiers reference the defined LLD behavior; there is no second verification matrix. All cards are Must / Draft, pending design approval.

### SRS-001: Attributable lesson selection
- **Source:** REQ-001 / AC-001; HLD-001 → CMP-RECIPE → LLD-REVIEW.
- **Statement/behavior:** Recipe preserves reviewed upstream dispositions, pinned evidence, current owner and factual/license limitations without wholesale import.
- **Failure/fallback:** Unverified claim stays qualified or rejected; equivalent current guidance is reused instead of duplicated.
- **Security invariant:** No bypass material or unmeasured efficacy assertion.
- **Verification:** VER-001, manual source review — implementation walkthrough's adoption-review evidence.

### SRS-002: Independent synthetic policy
- **Source:** REQ-002, REQ-004 / AC-005; HLD-002 → CMP-ORACLE → LLD-POLICY.
- **Statement/behavior:** Freeze policy, twenty required IDs, literal expectations and artifact identity independently before grading.
- **Failure/fallback:** Ambiguity or self-approved oracle blocks affected example acceptance; design review may continue.
- **Security invariant:** Normative permission is never inferred from implementation output or vulnerable characterization.
- **Verification:** VER-002, independent oracle review — hash-bound reviewer decision linked by independent_ground_truth_ref.

### SRS-003: Faithful pure example transformation
- **Source:** REQ-002 / AC-006, AC-007, AC-008; HLD-002 → CMP-EXAMPLE → LLD-EXAMPLE.
- **Statement/behavior:** Both functions follow the common pure input/output interface, exposing specified flaws versus fixed policy while preserving correct permitted results and input integrity.
- **Failure/fallback:** Invalid fixture references fail harness setup; mismatched behavior is failure, never silently mapped to deny/pass.
- **Security invariant:** Caller-visible denial discloses no resource; next-state is internal only; fixed role authority is trusted.
- **Verification:** VER-003, offline example behavior — native test row-level full-result and mutation evidence.

### SRS-004: Bounded findings and remediation
- **Source:** REQ-002 / AC-002, AC-003, AC-009, AC-010; HLD-001 → CMP-RECIPE → LLD-REVIEW.
- **Statement/behavior:** Worked reasoning identifies causal policy violation and concrete server-side correction, distinguishes compliant controls and insufficient source evidence, and labels unexecuted deployed retests.
- **Failure/fallback:** Missing decisive evidence remains explicit uncertainty; failed reproduction never establishes global safety or automatically false-positive.
- **Security invariant:** Existing finding status semantics and report ownership stay unchanged.
- **Verification:** VER-004, manual semantic review — independent packet adjudication and rationale in existing evidence carriers.

### SRS-005: Honest envelope and continuation
- **Source:** REQ-003 / AC-004, AC-011; HLD-001 → CMP-RECIPE → LLD-REVIEW.
- **Statement/behavior:** Envelope bounds supplied-artifact work; a blocked/refused active step preserves valid corroboration and independent remediation without provider/prompt evasion.
- **Failure/fallback:** Unknown authority/control blocks effects, not safe independent reasoning; no fabricated runtime receipts.
- **Security invariant:** Content portability is not provider acceptance, correctness, host enforcement or permission.
- **Verification:** VER-005, manual pressure-case review — independently graded envelope/continuation cases and limitations.

### SRS-006: Complete independent example checking
- **Source:** REQ-004 / AC-012; HLD-003 → CMP-CHECK → LLD-CHECK.
- **Statement/behavior:** Native entrypoint rejects corpus incompleteness and compares full literal expected results/state and input integrity for every required case.
- **Failure/fallback:** Missing/duplicate/unresolved/mismatched artifacts fail nonzero; no skip-as-pass or output-derived expectation.
- **Security invariant:** Executable proof is confined to synthetic functions; semantic, deployed API and provider claims need their own evidence.
- **Verification:** VER-006, offline example behavior — exact command/exit, required-case ledger and bound artifact versions in implementation walkthrough.

### SRS-007: Canonical package and honest readiness
- **Source:** REQ-004 / AC-013; HLD-004 → CMP-PACKAGE → LLD-PACKAGE.
- **Statement/behavior:** Owner discovery links resolve packaged resources and integration reports actual registry checks separately from unexercised publication/acceptance/activation.
- **Failure/fallback:** Missing resource/dependency or failed official check remains explicit and prevents the corresponding acceptance claim; no mirror shim or fake success.
- **Security invariant:** No runtime activation or shared-schema changes; preserve immutable historical evidence and applicable notices.
- **Verification:** VER-007, repository integration — registry/link receipts and separately classified NOT RUN lanes in implementation walkthrough.

## Functional Flows, Failure And Recovery

| Flow | Actor / goal / trigger | Normal course | Alternate / exception |
| --- | --- | --- | --- |
| FRS-001 | Reviewer / assess supplied path / bounded review request | Bind scope and policy → source trace → finding/fix/retest limits | Incomplete packet → specific missing fact; no invented certainty |
| FRS-002 | Verifier / compare example / accepted oracle + settled source | Validate corpus → isolate case → call each function → compare response/state/input → emit failures/results | Missing/ambiguous case or mismatch → fail; do not rewrite oracle to green |
| FRS-003 | Agent / continue independent work / active retest impediment | Record blocked step and provenance → retain justified source status → independent remediation | Missing producer evidence blocks only dependent claim; no disguised retry |
| FRS-004 | Integrator / prepare source acceptance / reviewed changes | Validate resources and actual entrypoint → independent semantic review → report readiness | Missing dependencies/check failure → incomplete gate; no publish or activation inference |

Consistency: each case is isolated and deterministic, one declared initial state, no shared writes or async ordering. There is no exactly-once network or distributed-state claim. Re-running this pure test is not a target retest; source or oracle changes require affected proof to be regenerated and independently reviewed.

Adverse timeline: oracle accepted → source/case semantics change → old review becomes stale → halt grading/promotion → reviewer accepts new identity → run affected check. Authority timeline: analysis underway → active request refused → record impediment → continue only independent permitted analysis; no active retry or provider switch.

| Failure | Disposition / recovery | Owner |
| --- | --- | --- |
| Oracle duplicates implementation logic or lacks required case | Block acceptance; repair independent policy/corpus, re-review | Reviewer / Verifier |
| Fixed function denies allowed editor update | Test failure; repair implementation, not policy | Author |
| Denied response contains resource or input changes | Test/security failure; no promotion | Author / Reviewer |
| Full internal state exposed as caller response | Contract violation; separate response/state | Author |
| Malformed source corpus or unresolved policy | Infrastructure/input failure; do not grade as deny | Verifier |
| Missing enforcement evidence or failed reproduction | Qualified evidence disposition, not secure/false-positive inference | Reviewer |
| Missing node_modules/tsx | Official checks unverified until dependencies are provisioned | Integrator |
| Pressure to bypass provider or activate lab | Refuse excluded effect; safe independent continuation | Every owner |

## Security, Compatibility And Decision Record

Categorical NFRs: zero network/service/credential/host-side effects in the example module; no mutation of inputs; exact expected resource/state comparisons; no fabricated evidence; distinct implementation and independent acceptance ownership. Methods are VER-002..007. No numeric latency, availability or cost SLO is warranted for this teaching package.

No production/API/event/storage migration. Evidence uses existing retention/access policy; persist only synthetic corpus and sanitized review/output references. Real credentials/PII are excluded. Retention policy for a future real engagement is not invented here. Rollback restores/discards unpublished canonical additions and removes their discovery link while preserving historical evidence; no runtime cleanup is implied. Existing consumers and evidence enums remain compatible.

**ADR-PNSD-001 — Local teaching artifacts, not a new executor (proposed).** Context: the offline owner and package resource transport already exist; the old F02 fixture lacks the approved tenant/code teaching depth. Decision: package a focused recipe, pure ESM examples and declarative oracle; repository verifier stays outside the installed skill. Alternative: lab fixture/runtime expansion, rejected because it crosses dormant gates and adds effects not needed for this contract. Assumption: a concrete recipe has incremental value, still unvalidated. First failure: equivalent content or independent review shows no benefit; use the no-change/defer option. Cost to abandon: discard unpublished additions, no runtime migration. This is an embedded local design decision; it changes no global ADR or public runtime contract.

## Parallel Handoff And Human Gates

After human design approval, `implementation-readiness` checks exact source/oracle identity, independent Reviewer assignment, eligible account/profile and missing check prerequisites. Implementation approach is still unselected: offer **Subagent-Driven (recommended)** versus **Inline** only where policy permits an explicit exception. No approval is inferred from role names, economical routing or design_ready status.

Once approved interfaces and oracle are frozen, Author alone owns recipe/module/matrix/link, Verifier alone owns test. They may author in parallel; neither runs shared checks while edits are in flight. Integrator runs focused RED/GREEN and smoke after owners settle, preserves actual failing-before/passing-after classifications, and coordinates independent architecture/security review. If runnable test initially fails on missing imports rather than intended behavior, report invalid RED, not a successful regression proof. No tests of wording, file copies or forwarding are added as behavioral proof.

Design approval recorded on 2026-11-07. Remaining gates: independently accepted oracle bound to actual future artifacts; implementation execution approach; named eligible workers; actual example/registry/semantic results. They block coding or acceptance as appropriate, not the approved design. No G3/G4/G5 lab gate, provider budget or publication authority is supplied by this design.

## Status And References

feature_status: design_ready
approval: approved(requesting operator, 2026-11-07)
Next workflow: `implementation-readiness`; design approval recorded. `design_ready` means the technical contract is approved for readiness review, not implemented or behaviorally verified.

Evidence walkthrough: [srs-walkthrough-provider-neutral-security-depth.md](srs-walkthrough-provider-neutral-security-depth.md).
Run record: [20261107T063322Z-design-solution.json](../../artifacts/runs/provider-neutral-security-depth/20261107T063322Z-design-solution.json).

Current owner/evidence references: [scoped validation](../../skills/cybersecurity/cyber-scoped-validation/SKILL.md), [base validation record](../../skills/cybersecurity/cyber-scoped-validation/references/validation-record.md), [shared evidence](../../skills/cybersecurity/cyber-evidence/references/evidence-record.md). Existing package-prefix support observed at `cli/src/services/SkillSyncService.ts:633-639` and `scripts/generation/isolated-stage.ts:124-133`; native Node example patterns at `scripts/skill-tests/marketing-measurement/report-marketing.test.mjs` and `skills/marketing/marketing-demo-video/scripts/validate-demo-storyboard.test.mjs`. These are source observations, not new consumer smoke.
