# Feature Plan: Provider-Neutral Security Teaching Depth

Status: approved plan for technical design; owner: repository maintainer acting as Product Owner
slug: provider-neutral-security-depth
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
delivery_mode: extended
brief_approval: approved(requesting operator, 2026-11-07)
plan_approval: approved(requesting operator, 2026-11-07)
repository_status: approved_plan_saved
activation_status: not_required
Last updated: 2026-11-07

## Decision Brief

- **Changes since approved brief:** No scope expansion. Select `cyber-scoped-validation` as the single recipe owner; separate permissions-oracle review, example verification and source integration. Decompose broad BRD criteria into atomic PRD criteria below. Recover historical CLV authority rather than replacing missing checkout documents.
- **Recommendation:** Add one original, demand-loaded offline access-control worked recipe and minimal pure synthetic artifacts; reuse shared evidence/report formats and existing provider exports. Do not modify the dormant lab package.
- **Impact if wrong:** Duplicated or misleading security guidance, denied legitimate access, false vulnerability findings, or synthetic checks presented as deployed-system proof. Independent policy review and explicit fidelity limits are required.
- **Evidence and limitations:** confirmed(approved BRD, canonical offline/evidence owners, existing F02 fixture, recovered historical approval at `92d06c420`). Incremental teaching benefit is assumed, not measured; no provider or lab behavior was exercised.
- **Plan approval:** Requesting operator replied `Ok` on 2026-11-07 to the presented plan and technical-design-only gate. Scope, owner roles, priority and delivery plan are approved. This is not implementation execution-mode selection, budget, provider-account authorization, publication, merge or activation approval.
- **Independently ready work:** Technical design and oracle specification can use current/historical authority without new live evidence. Authoring, tests and integration remain unstarted; final security acceptance requires a reviewer distinct from the author. High-tier coding waits for approved technical design and execution approach.
- **Next route:** `design-solution` after plan approval, then `implementation-readiness`. Technical design must settle exact artifact interfaces, test entrypoint and review evidence before implementation.

## Outcome And Guardrails

Source: [approved BRD](../brd/brd-provider-neutral-security-depth.md), snapshot `C997` after operator approval recording. Snapshot tag identifies the consulted local content, not an immutable Git commit. Objective: BRD-OBJ-001.

Outcome: a consuming agent can reason from supplied synthetic source and explicit permissions to a justified finding, remediation and bounded retest expectation, preserving uncertainty and independent safe continuation.

Carry forward the proposed SMART metric: within 14 calendar days after implementation approval, maintainers accept evidence for the approved BRD's five criteria, refined below. Capture baseline answer/example behavior before changing guidance; no live-model baseline is authorized by this plan. No claim of reduced refusals, increased task success, lower latency or cost without separately approved comparable observations.

Guardrails: ADR-012/018/019; existing finding statuses and shared evidence fields; source-review versus active-effects separation; no real targets/credentials, network probing, listener, container, lab adapter, exploit script, or host-control proof fabricated from synthetic tests. No policy bypass, disguised retry or refusal-driven provider switching. Clear authorization may reduce ambiguity; it never guarantees provider acceptance.

## Scope And Non-Goals

### In Scope

Containment tree; every leaf belongs to one capability:

- **Teach supplied-artifact review**
  - Classify upstream lessons → REQ-001 / AC-001.
  - Explain policy-based access reasoning → REQ-002 / AC-002, AC-006..009.
  - Connect finding, fix and retest limits → REQ-002 / AC-003, AC-010.
- **Preserve provider and authority boundaries**
  - Supply truthful task envelope → REQ-003 / AC-004.
  - Continue independent work after blocked active testing/refusal → REQ-003 / AC-011.
- **Verify bounded teaching artifacts**
  - Review independent oracle and execute pure examples → REQ-004 / AC-005, AC-012.
  - Validate canonical resources without claiming activation → REQ-004 / AC-013.

Actor: agent consuming the offline recipe. Trigger: review request supplying synthetic policy/source artifacts. Intended result: bounded analysis and report. Rules, exceptions and unknowns are specified by the AC table and decision table; the example policy is synthetic, never a production authorization policy.

### Deferred

Other vulnerability families and live cross-provider acceptance comparisons remain candidates referenced in the [BRD capability inventory](../brd/brd-provider-neutral-security-depth.md#capability-inventory-and-slices), outside this delivery. No ticket was supplied; no external ticket or commitment is invented. A later empirical slice needs provider/account/data/budget approval and `validate-product` experiment framing.

### Excluded

Wholesale import, new framework/provider adapter, policy evasion, operational attack commands, live target validation, lab gate/catalog expansion, production remediation, new security evidence schema, new evaluation runner, runtime activation, remote fetching of historical requirements, release/tag/deploy actions and measurement claims. No market toggle or web/mobile product policy is being introduced; this is repository guidance for agents.

## Canonical Requirements And Acceptance Criteria

This PRD is the downstream canonical definition. The BRD remains the approved intent baseline; its five original AC IDs retain their topic/meaning. AC-006..013 decompose those broader criteria rather than silently narrowing them. IDs are local to this slug; do not confuse them with historical CLV IDs.

Roles: **PO** repository maintainer acting as Product Owner; **Author** scoped-validation maintainer; **Reviewer** independent security reviewer; **Verifier** QA/verification maintainer; **Integrator** registry maintainer. The operator accepted maintainer ownership defaults in the BRD. Each eventual worker must be identified before dispatch; a role label is not proof of assignment or human approval.

| Req ID | Requirement | Owner | Priority | Status | BRD objective |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Retain a pinned, attributable adopt/covered/qualify/reject comparison for reviewed upstream patterns without importing unsupported assertions. | PO | P1 | Approved | BRD-OBJ-001 |
| REQ-002 | Teach one synthetic tenant-aware access-control review from policy and source through justified finding, remediation and retest expectations. | Author | P0 | Approved | BRD-OBJ-001 |
| REQ-003 | Keep the task envelope truthful and separate safe analysis, model acceptance and runtime authorization. | Author | P0 | Approved | BRD-OBJ-001 |
| REQ-004 | Provide independent policy/semantic review and bounded example/resource verification, reporting unexercised lanes honestly. | Verifier | P0 | Approved | BRD-OBJ-001 |

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Pinned upstream samples and current owner references | Maintainer reviews adoption notes | Every reviewed pattern has a disposition, source and local owner; factual counterevidence and copying/license obligations are retained, with no measured-efficacy claim. | PO | Manual source review |
| AC-002 | REQ-002 | Synthetic policy matrix, trusted principal attributes and vulnerable source | Consumer analyzes an object/action authorization path | Finding identifies the exact violated policy row and missing/misbound server-side check; predictable IDs, HTTP status or unusual output alone are not accepted as proof. | Reviewer | Manual semantic review |
| AC-003 | REQ-002 | Corroborated synthetic finding and supplied patched source | Consumer drafts remediation/retest handoff | Report connects evidence and root cause to the server-side fix and expected post-fix cases, labeling synthetic/source proof separately from unexecuted deployed retest. | Reviewer | Manual semantic review |
| AC-004 | REQ-003 | Owned supplied artifacts and a bounded review request | Consumer constructs task envelope | Envelope names authorization scope, allowed offline analysis, excluded effects and desired evidence/fix output without claiming a policy waiver or guaranteed acceptance. | Reviewer | Manual pressure-case review |
| AC-005 | REQ-004 | Frozen matrix with rationale and reviewer distinct from author | Oracle review precedes answer grading | Policy expectations are approved independently of implementation outputs and bound to exact artifact revision/digest; unresolved policy ambiguity fails that example's readiness. | Reviewer | Independent oracle review |
| AC-006 | REQ-002 | Explicit same-tenant read permission | Supplied fixed function evaluates that case | Correct synthetic resource is returned without unrelated state mutation. | Verifier | Offline example behavior |
| AC-007 | REQ-002 | Authenticated principal and another tenant's restricted object, no exception | Supplied vulnerable and fixed functions evaluate the case | Vulnerable result demonstrates the specified policy violation and fixed result denies access without exposing that object. | Verifier | Offline example behavior |
| AC-008 | REQ-002 | Principal lacks privileged action permission, including a caller-supplied role claim | Supplied fixed function evaluates the case | Trusted principal policy controls the verdict and rejects the unauthorized action without mutation. | Verifier | Offline example behavior |
| AC-009 | REQ-002 | Correctly authorized negative-control source with complete policy | Consumer assesses the supplied path | Report does not invent a vulnerability from identifier predictability or an allowed result; conclusion stays bounded to supplied evidence. | Reviewer | Manual semantic review |
| AC-010 | REQ-002 | Decisive policy, ownership or enforcement evidence is missing | Consumer assesses the claim | Report states the missing fact and limits certainty; it neither asserts confirmed vulnerability nor infers global safety from failed reproduction. | Reviewer | Manual semantic review |
| AC-011 | REQ-003 | Valid supplied corroboration and a blocked/refused active retest request | Consumer handles the impediment | It records the blocked step, preserves justified supplied finding status and continues independent safe remediation without fabricated execution or disguised retry/provider switching. | Reviewer | Manual pressure-case review |
| AC-012 | REQ-004 | Frozen oracle and supplied pure examples | Verifier runs the approved bounded entrypoint | Every required matrix case is compared to its independent expected result; missing/duplicate cases, mismatched verdicts, allowed-access regressions and unexpected mutations fail nonzero. Evidence is limited to example-function behavior. | Verifier | Offline example behavior |
| AC-013 | REQ-004 | Integrated canonical package and resource edits | Integrator performs registry/resource verification | Changed resources resolve through the owner and registry validation reports actual results; publication/discovery, live provider acceptance and host isolation remain NOT RUN unless separately authorized and observed. | Integrator | Repository integration |

BRD decomposition: AC-001 remains AC-001; AC-002 expands to AC-002/006/007/008/009/010; AC-003 expands to AC-003/011; AC-004 expands to AC-004/011; AC-005 expands to AC-005/012/013. These are references, not second AC definitions.

## Decision Table And Evidence Semantics

The fixture policy is a teaching example, not an invented customer policy. Technical design freezes exact actors/resources/actions; do not derive expected permissions from the code under test.

| Source condition | Analysis disposition | Authority consequence |
| --- | --- | --- |
| Complete synthetic policy and concrete violating source path | Bounded source finding justified by corroboration | No claim that deployed request was exercised |
| Complete policy and compliant supplied path | Negative-control conclusion for this path | No global clean/security claim |
| Missing decisive policy or enforcement fact | Explicit uncertainty and missing input | No invented observation or automatic false-positive |
| Active retest lacks matching runtime authority/proof | Block active step; retain valid supplied evidence | Independent offline work continues |
| Provider refuses task | Record refusal at that step | No laundering, provider substitution or authority expansion |

Default example has no privileged cross-tenant exception. If design introduces one, the policy must explicitly define principal/action/resource bounds and independent review must cover both its allowed and denied edges; do not assume generic admin omnipotence. Existing evidence enum remains authoritative; missing exercised evidence does not erase independently corroborated source evidence.

## Delivery Plan And Ownership

Proposed paths below are design inputs, not claims the files already exist. Single owner per component; one integrator owns all shared generated/docs changes. No worker runs shared checks mid-flight.

| Slice | Owner / proposed owned paths | REQ / AC references | Dependency / artifact / verification reference | Estimate / routing |
| --- | --- | --- | --- | --- |
| D — Freeze technical boundary and oracle contract | Design owner; `docs/srs/srs-provider-neutral-security-depth.md` | All REQ; AC-005/012/013 | After plan approval; technical design settles pure fixture interface, oracle independence and no-effects entrypoint. Uses lanes from AC table. | S, high confidence; sensitive contract review, strong capability hint, no premium implied |
| A — Author original worked recipe | Author; `skills/cybersecurity/cyber-scoped-validation/references/offline-access-control-worked-recipe.md`, minimal SKILL.md discovery link, package-local synthetic assets only as approved by design | REQ-001/002/003; AC-001..004/006..011 | After D and independent oracle review. Demand-loaded recipe, not lab catalog/schema edits. | M, medium confidence; S=1 N=1 C=2 high; approved eligible implementation route |
| B — Verify independent examples | Verifier; proposed `scripts/skill-tests/provider-neutral-security-depth/access-control.test.mjs` only, consuming A's frozen interface; no duplicate fixture ownership | REQ-004; AC-005/006/007/008/012 | After D interface freeze, test authoring may run parallel to A using the approved independent oracle. Execute only once A and B settle. | S, medium confidence; S=1 N=1 C=2 high for security oracle; no cheaper route bypassing sensitivity floor |
| C — Integrate and adjudicate | Integrator owns docs/changelog and approved generated outputs; Reviewer owns independent adjudication, never A's implementation | All REQ; AC-001..013 | After A/B; registry checks, example smoke and independent semantic review. Add scoped CHANGELOG entry and update architecture/contribution guidance only where approved behavior changes need explanation. Preserve historical records. | S, medium confidence; integration high review depth; no runtime/publication authority |

Top-level sequence: approve plan → D/design approval → readiness and execution-mode gate → A/B parallel under frozen interfaces → C/integrated verification → explicit source acceptance. A/B share only read-only policy/interface inputs. If a design change affects the interface or oracle, return it to the design/reviewer owners before work continues; never have siblings edit the same fixture.

Candidate test command, **not runnable until its proposed file is implemented and authorized**: `rtk node --test scripts/skill-tests/provider-neutral-security-depth/access-control.test.mjs`. No new framework/package script is required. It may import only pure example code and declared supplied artifacts; no service, sockets, credentials, subprocess security tool or lab state. It establishes neither real API behavior nor causal provider improvement.

Existing downstream check candidates, all NOT RUN in this planning session: `rtk pnpm --filter ./cli validate:all`, `rtk pnpm audit:skills`, `rtk pnpm audit:injection`. Changed-only discovery selects SKILL.md, so reference/assets-only changes must not rely on it. `rtk pnpm test:evals` is relevant only if the eval machinery/contracts change; lexical assertions are not the oracle. No mandatory new lexical eval file; human semantic cases may be more honest. Publication is not currently in scope; if commissioned, existing generators, resource/ID parity and real temporary-consumer discovery are separate requirements, never inferred from validation.

## Governance, Risks And Readiness

RACI: PO accountable for REQ/scope approval; Author responsible for recipe; Reviewer accountable for independent policy/semantic acceptance; Verifier responsible for executable proof; Integrator responsible for source coordination. Requesting operator retains human plan/merge/publication authority. A worker cannot sign its own independent acceptance. Exact workers and eligible profiles are selected at dispatch, not invented now.

| Risk / affected scope | Mitigation and owner | Readiness consequence |
| --- | --- | --- |
| Oracle mirrors implementation or fixture omits tenant boundary | Reviewer freezes independent matrix before grading; Verifier compares actual cases | Blocks A/B acceptance, not design authoring |
| Generic audit advice treats any unfiltered ID lookup as vulnerability or demands live proof for source conclusions | Design/reviewer explicitly distinguish policy violation and synthetic/source proof; common-security-audit remains unchanged | Resolve recipe semantics in D; no blanket standard rewrite |
| Scope accidentally activates dormant CLV package | Author preserves current offline rules; Integrator checks ADR-019 exclusions | Any activation/attack content fails review |
| Pure sample presented as deployed-server/security proof | Explicit fidelity limits and separate NOT RUN lanes | Fails semantic acceptance |
| Extra guidance has no incremental teaching value | Review existing equivalents and baseline artifact decisions; use no-change fallback if duplicate | Teaching benefit stays unvalidated; no efficacy claim |
| Publication and source completion conflated | Integrator records repository/activation/discovery states separately | No publication without new matching approval |

Open consequential gates:

| Decision | Owner | Affected slice | Required input |
| --- | --- | --- | --- |
| PRD/delivery plan approved | Requesting operator | D onward | `Ok` on 2026-11-07 approves presented plan and technical design only; gate satisfied |
| Approve technical design and independent oracle | Engineering owner / independent Reviewer | A/B | D design revision, exact artifact interface and oracle acceptance |
| Select implementation execution approach | Requesting operator | A/B/C implementation | Subagent-Driven recommended, or explicit Inline exception where policy permits; not selected by this plan |

No new API/storage/event schema or production migration is included. Rollback means discard unpublished guidance or restore prior reviewed source revision; preserve evidence. It is not a host teardown operation. State migration/cleanup and latency SLOs are inapplicable to this repository-only plan; do not fabricate numerical runtime limits.

## Evidence And Historical Authority

- confirmed([approved BRD](../brd/brd-provider-neutral-security-depth.md)): intent, safe interpretation, owner defaults, objective and scope. Its upstream pin `a8de813edc9f66f60d44cfe42d47750e89d9930b` and adoption evidence are reused without another external audit.
- confirmed([offline owner](../../skills/cybersecurity/cyber-scoped-validation/SKILL.md), [validation record](../../skills/cybersecurity/cyber-scoped-validation/references/validation-record.md), [shared evidence](../../skills/cybersecurity/cyber-evidence/SKILL.md)): supplied-source analysis and status semantics.
- confirmed([F02 fixture](../../skills/cybersecurity/cyber-lab-validation/assets/fixtures/f02-access-matrix.json)): four role/resource read rows, no tenant fields or vulnerable/fixed implementation. Preserve it unchanged; partial overlap does not satisfy the full recipe contract.
- confirmed([ADR-019](../../ARCHITECTURE.md#adr-019-governed-cybersecurity-lab-validation-boundary-adr-clv-01), [CHANGELOG](../../CHANGELOG.md)): offline owner and separate dormant gates.
- confirmed(historical `92d06c420:docs/srs/srs-task-list-governed-cybersecurity.md` and `92d06c420:docs/srs/srs-cyber-lab-validation.md`): parent ran `rtk git log --all --format='%h %ad %s' --date=short -- docs/srs/srs-task-list-governed-cybersecurity.md`, then `rtk git show` for both files. Recovered dated G2 decision: operator `Approve g2`, 2026-10-24, reviewed SRS SHA-256 `14230a1d97b361060ce24fd7da6a324347101bb607e0285d5dbdca6490605ba7`. The dated decision supersedes earlier pending labels; G3/G4/G5 remain pending. Historical authority is referenced, not restored as editable duplicate documents.
- confirmed([outcome schema](../../scripts/outcome/schema.ts), [audit implementation](../../scripts/outcome/index.ts)): RunRecord v1 and required identity-scoped audit exist; record validation is schema/scope assurance, not implementation approval.
- assumed: worked teaching increases useful security-review decisions. No measured baseline or causal benefit claimed.
- unknown: live provider acceptance, current host isolation, empirical task success and all activation gates. They are outside this first slice, not prerequisites for static recipe planning.

No canonical product evidence ledger for this slug was found in the bounded lookup; no product IDs are minted. Source paths and frozen historical references remain the evidence ledger.

## Status And Handoff

feature_status: requirements_ready
plan_approval: approved(requesting operator, 2026-11-07)
Next workflow: `design-solution`; plan approval recorded. Coding still requires the technical-design and execution gates.
Run record: [20261107T062635Z-plan-feature.json](../../artifacts/runs/provider-neutral-security-depth/20261107T062635Z-plan-feature.json).

Trace seed: BRD-OBJ-001 → REQ-001..004 → AC-001..013. D will mint technical-design IDs only where required. Existing lab and shared schema IDs remain unchanged.

PM checks: scope classified; approved meaning retained; atomic ACs carry owner and one verification lane; current/historical authority recovered; independent acceptance separate from checks; plan/design/execution/publication approvals separated. No code, fixture, skill, provider export or lab action was changed during planning.

Planning check receipt: `rtk pnpm audit:outcome --records --required --slug provider-neutral-security-depth --workflow plan-feature --run-id 20261107T062635Z-plan-feature --json` failed before validation because `tsx` and local `node_modules` are missing. No official audit PASS is claimed. A temporary Node-only consistency check passed: four unique requirement rows, thirteen unique AC rows with valid requirement references, twelve resolving local file links, required record fields/identity and pending plan-approval state. This is local document consistency only, not the official schema validator, independent semantic acceptance or implementation proof. The temporary checker was removed after execution.

## Cost Report

`get_session_cost(workflow="plan-feature", slug="provider-neutral-security-depth")` supplies partial MCP telemetry only. Complete actor token usage/prices and aggregate cost are unavailable; no numeric savings or total cost claim is made.
