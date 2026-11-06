# Technical Design: Project Verification Readiness

Status: Approved technical design; repository source implemented and frozen for independent review | Owner: repository maintainer | Updated: 2026-11-05

slug: pstack-verification-readiness; operator_profile: technical; lane: direction; delivery_mode: extended; snc_tier: high; approval: approved(operator, 2026-11-05)

## Decision Brief

**Recommendation:** one optional portable common skill, project-owned Markdown kits, thin references from existing lifecycle gates, and a narrowly scoped formal-AC digit-width compatibility change. No app-control service, scheduler, new requirements ledger or new workflow.

**Changes from the approved PRD:** resolve D1/D2/D4 below; retain REQ-001–003 and AC-01–14. Tooling compatibility is the PRD's existing D4 obligation, not an unrelated refactor. The prior scope, value hypothesis and non-goals remain unchanged.

**Impact if wrong:** stale operational recipes could yield false verification; ambiguous instance ownership could damage another session; partial ID support could lose trace links. The controls below preserve failure visibility and exact identity.

**Approval recorded:** operator explicitly approved this technical contract and selected Subagent-Driven implementation on 2026-11-05 (“approve design + subagent-driven implementation”). This authorizes bounded repository implementation; it does not authorize pilot exposure, publication, merge, deployment or spend.

**Remaining decisions:** project owner selects/authorizes a real target before live driving (PRD D3). D5 (execution approach) is resolved: Subagent-Driven implementation approved. Independent repository work proceeds without waiting for a separate product-value pilot.
## Trace Source And Evidence Boundary

- Original work item: ../brd/brd-pstack-verification-readiness.md, approved(operator, 2026-11-04).
- Detailed source: ../prd/prd-pstack-verification-readiness.md, approved(operator, 2026-11-05); SHA256 `367e3db74753f0b36a4265a350b0b124a09c59eb1a9c89a277e417a6fd69b874` observed at design start. Scope owner: repository maintainer. Prior scoped-approval evidence is the explicit operator reply recorded in that artifact.
- Source IDs: BRD-OBJ-001; REQ-001–003; AC-01–14. The PRD alone defines the ACs; this design references them.
- confirmed(ARCHITECTURE.md §3/ADR-005): registry source and canonical lifecycle ownership, not a daily runtime.
- confirmed(scripts/generate-indices.ts:40–72; CONTRIBUTING.md:69–80): skill resources are packaged from supported skill-local folders and notices; public guidance excludes project-specific environment/account recipes.
- confirmed(scripts/outcome/schema.ts:105–109; scripts/trace/types.ts:6–22): two independent formal-AC patterns currently require three digits. confirmed(scripts/trace/parse.ts:325–342): declarations retain exact tokens in sets/maps.
- No baseline SRS or project kit was available in the queried design paths. This is checkout-local evidence, not proof of absence elsewhere. Search accessible authorized equivalents before creating a consumer kit.
- Source inspection establishes current contracts, not agent compliance or live application efficacy. Verification status: srs-walkthrough-pstack-verification-readiness.md.

## HLD-001: Boundaries, Ownership And Dependency Direction

Audience: component implementers, independent reviewers and project owners. Lifecycle: proposed design. All communication is synchronous file/reference consumption through the host's existing tools; no service/event bus or async delivery guarantee is introduced.

| Component | Owner | Owned files / boundary | Dependencies and failure domain |
| --- | --- | --- | --- |
| CMP-001: reusable kit guidance | Kit maintainer | Proposed skills/common/common-project-verification/SKILL.md and references/kit-contract.md, references/maintenance.md | Source instructions only; cannot install drivers, operate targets or grant authority |
| CMP-002: project operational kit | Target project maintainer | Proposed docs/verification/<app>/README.md, features/README.md and per-feature Markdown; or one existing equivalent | References canonical criteria, driver documentation and actual target; private data stays project-owned |
| CMP-003: lifecycle consumers | Lifecycle maintainer | .agents/workflows/implementation-readiness.md and verify-work.md | Consume CMP-001/002; retain existing prerequisite/verdict roles and authority lanes |
| CMP-004: formal ID compatibility | Tooling maintainer | scripts/outcome/schema.ts; scripts/trace/types.ts; affected existing tests/fixtures/comments | Retains exact tokens and all non-AC validation; no runtime/kit dependency |

Product/plan/design approval: repository maintainer accountable. Each component owner is responsible for its owned implementation only. Independent reviewer owns technical acceptance evidence, separate from the implementer. Project owner/host controls target access and isolation. Orchestrator integrates disjoint results and owns generated/doc updates. No role label supplies human approval or host permissions.

## ADR-VER-001: Portable Project Kits, Scoped Proof And Exact IDs

Status: Accepted (approved by operator on 2026-11-05 as part of technical design approval).
- **D1:** ship optional common/common-project-verification guidance with on-demand references. Store new consumer kits under docs/verification/<app>/; reuse an accessible equivalent rather than migrate it merely for naming. Supply its path in the approved work-item/handoff as a plain kit reference, not a new mandatory JSON schema field. No broad *.md trigger or forced new workflow.
- **D2:** use Markdown feature navigation and the existing report/evidence mechanism. Bind each proof to its source/build/dirty identity and relevant map/harness/dependency content; require affected reproof instead of blanket age-based invalidation. No second editable AC database or new telemetry store.
- **D4:** widen only formal AC suffixes to two-or-more decimal digits in the outcome and trace grammars. Keep exact strings and all other grammars unchanged. A two-digit identifier and a three-digit identifier with the same numeric value remain distinct identifiers; neither aliases nor numeric normalization are permitted.
- **Rejected:** Cursor-only kit storage (portability); automatic whole-project reruns (unrelated work blocked); schema-valid equals proof (false assurance); renumbering or aliases (breaks approved trace); importing all pstack defaults (scope/authority conflict).
- **Cost to abandon:** remove optional guidance/gate references under authorized maintenance, preserving project evidence. Narrow ID compatibility has no destructive migration and should remain if approved records depend on it; reverting it would again reject those records, not magically migrate them.

## LLD-001: Kit Discovery And Markdown Contract

1. Read an explicit kit reference from the current approved task/handoff when supplied. Validate access, project scope and that it resolves inside an authorized project location. An explicitly missing/inaccessible reference is an affected prerequisite gap, not permission to silently substitute another target.
2. Otherwise inspect project documentation for an equivalent kit, then the proposed docs/verification/<app>/ convention. One equivalent is reused. Multiple incompatible candidates are returned to the project owner for scoped selection; no automatic merging of conflicting recipes.
3. If no equivalent is found, generating a kit requires task scope and target permissions. Do not run an app merely because a directory or skill exists.
4. Project README defines **Launch**, **Doctor**, **Drive**, **Evidence**, **Cleanup**, and any **Helpers**, using inspected commands/handles. Record author/owner, source basis, applicable platform, data/auth/reset prerequisites, instance/resource ownership and readiness oracle. A listening port is not sufficient readiness.
5. features/README.md indexes stable journey names and the declared coverage boundary. Each feature file links canonical source+revision and AC IDs and supplies entry paths, preconditions, interaction handles, observable-result references, affected source paths/dependencies and gotchas. Include three representative journeys or all if fewer; unexecuted recipes remain explicitly unproven. Do not copy editable AC definitions into the kit.

Plain Markdown fields may be headings/tables; no new machine parser or kit manifest is required. Readable names are navigation identifiers, not new requirement IDs. New examples must be executable against their actual target before claimed proven; published generic guidance must not contain project credentials, account/VPN settings or machine-specific paths. Helpers, if a real gap requires them, stay project-owned, executable and documented; no bundled universal driver is designed.

## LLD-002: Execution, Freshness And Maintenance Contract

**Proof record:** attach a per-journey row to the existing task verification report, not a second outcome ledger. It contains journey/criterion references; approved source revision; actual build/source and dirty-content identity; map/recipe and harness content digests; scoped source/dependency references; exact action and observable result/side effects; evidence locations; source-review and live-coverage status; instance/resource owner; cleanup observation; limitations and disposition. Missing fields are unknown, not zero or verified. A Git HEAD alone does not identify dirty content.

**Freshness:** source review identifies each journey's dependencies, including shared launch/doctor/data/harness paths. A change intersecting those inputs, criteria, recipe or target build marks affected proof stale until re-driven. A build difference may be reconciled by explicit source/dependency review; never assume two different builds behave identically. If dependency impact cannot be bounded, mark all journeys depending on the uncertain shared component stale, not an unrelated project. Unchanged unrelated proof remains usable only with an explicit dependency/identity basis. Timestamp freshness alone is insufficient. These are review rules, not a claimed automatic provenance engine.

**Execution ordering:** obtain authority and ownership, launch, doctor, drive, capture action/result/side effects, cleanup, confirm retained proof. Shared state has one named driver owner; source investigation may run concurrently but never double-drive the shared instance. Parallel driving requires separate ports/profiles/data and owned resource handles. Doctor is read-only. On surprising state or failed drive, doctor and restore known state only under the kit's owned reset instructions before another drive. No unbounded retry or process-name killing.

**Evidence retention:** preserve existing .playwright-cli/<session>/ or .appium-mcp/<session>/ conventions for their drivers. Other surfaces may use run-owned artifacts/verification/<app>/<run-id>/ as proof storage, not a new telemetry ledger. Cleanup removes only run-owned process/resource state and never the evidence directory. Record the target's authorized retention/privacy rules; no global automatic deletion schedule. Avoid secrets/personal data in capture; an unsafe capture is not required to prove a journey.

**Maintenance:** select explicit scope (whole map or named journeys), source-review all in scope, then live-drive every journey for which coverage is claimed. Classify doc drift, harness failure or product regression. Only owned kit/map/harness edits are allowed; product changes and requirement changes route separately. Re-drive every correction claimed verified. Missing entitlement/platform/data remains an owned blocked/unreachable limitation; it cannot make required coverage clean. Report clean, changed or blocked with the exact scope and per-journey coverage; a scoped clean report does not certify the whole app. No schedule is implied.

## LLD-003: Gate Integration And Identifier Compatibility

**Readiness:** consume kit/dependency references only where applicable; report missing target prerequisites for affected slices. Do not require a new kit when equivalent instructions already suffice. Keep existing brief-mode equivalence, platform-driver requirements and partial readiness. It is not a runtime PASS.

**verify-work:** reuse its current driver ladder, evidence directories and PASS/FAIL/BLOCKED semantics. Stale required proof cannot PASS. A product defect is FAIL; missing required authority/driver/data is BLOCKED. Kit maintenance outcome is not a replacement verdict. Technical verification never implies business acceptance or deployment authorization.

**Formal AC contract:** proposed `/^AC-\d{2,}$/` in both scripts/outcome/schema.ts TRACE_ID_PATTERNS.acceptance_criteria and scripts/trace/types.ts ID_GRAMMAR.AC. Reject single-digit suffixes, empty suffixes, non-digits and trailing junk. Preserve REQ/BRD-OBJ/SRS patterns and the separate qualified historical-source AC grammar. Extraction and declaration maps already retain tokens; no normalization/parser rewrite is needed. A two-digit reference cannot resolve a differently padded three-digit declaration.

Update the broken trace fixture whose malformed seed currently carries a valid two-digit identifier so that it carries a genuinely invalid single-digit suffix, with affected comments and semantic expectations. Retain negative coverage; never merely delete a failing case. Prove accepted suffix widths, continued malformed rejection, non-AC constraints, exact-string resolution and that differently padded identifiers stay independent nodes. Old three-digit records remain accepted. The proposed widening is a public accepted-input change requiring this design's approval, not an already shipped fix.

## Technical Requirement Cards

All cards: priority Must; status Implemented at repository source, verification per the results section below; owner as HLD component table. One authoritative verification mapping per card follows. VER IDs designate evidence lanes; only the rows marked with an observed result are verified.

### SRS-001: Reuse One Scoped Kit
- Source/trace: REQ-001, AC-01, AC-08 → HLD-001 → CMP-001/002 → LLD-001.
- Statement/behavior: discovery follows LLD-001 and yields one reusable kit or an owned affected-scope gap.
- Failure/NFR: inaccessible explicit refs or conflicting candidates cannot silently select a target or expand authority.
- Verification: VER-001, consumer-smoke — actual discovery/entrypoint transcript linked from the walkthrough.

### SRS-002: Execute And Clean Up Owned Resources
- Source/trace: REQ-001, AC-02, AC-04, AC-09, AC-11, AC-14 → HLD-001 → CMP-002 → LLD-001/002.
- Statement/behavior: kit handoff follows its own real target path, health oracle, owned-resource and retained-proof contract.
- Failure/NFR: wrong/unhealthy instances are not driven; failed attempts leave no owned residue; proof and unrelated instances survive cleanup. No fabricated latency/availability threshold.
- Verification: VER-002, consumer-smoke — real action/result/side-effect, doctor and cleanup artifacts in the authorized run directory.

### SRS-003: Link Journeys And Scope Evidence Freshness
- Source/trace: REQ-002/003, AC-03, AC-10, AC-12 → HLD-001 → CMP-002/003 → LLD-001/002.
- Statement/behavior: map entries and proof use canonical criteria references and scoped identity/dependency linkage; incomplete coverage and stale proof stay visible.
- Failure/NFR: changed common dependencies invalidate their consumers; unrelated evidence is not globally invalidated; no directory/digest alone proves behavior.
- Verification: VER-003, consumer-smoke — exercise changed/shared/unaffected journey cases and inspect linked report dispositions.

### SRS-004: Preserve Product Failures During Maintenance
- Source/trace: REQ-002/003, AC-05, AC-07, AC-10, AC-13 → HLD-001 → CMP-001/002 → LLD-002.
- Statement/behavior: maintenance distinguishes the three discrepancy classes and re-drives owned corrections before claiming changed coverage.
- Failure/NFR: broken app behavior cannot be fixed or hidden by a kit-only maintenance run; unsafe/unreachable paths remain blocked with owned prerequisites.
- Verification: VER-004, consumer-smoke — real discrepant map/harness/product cases, scope-specific report and preserved failing expectation.

### SRS-005: Retain Existing Lifecycle Authority
- Source/trace: REQ-003, AC-06, AC-08, AC-12 → HLD-001 → CMP-003 → LLD-003.
- Statement/behavior: thin workflow references consume kit evidence without changing existing gate owners/driver ladders.
- Failure/NFR: technical readiness, verification, business acceptance and release remain distinct; missing authority blocks only dependent work.
- Verification: VER-005, consumer-smoke — invoke actual consumer discovery/gate scenarios including stale proof, unavailable driver and absent human approval; keyword assertions are insufficient behavioral proof.

### SRS-006: Preserve Two-Digit AC Identity End To End
- Source/trace: REQ-003, PRD D4, AC-03/06/12 trace obligations → HLD-001 → CMP-004 → LLD-003.
- Statement/behavior: formal outcome/trace paths accept two-or-more-digit AC IDs exactly, with unchanged other namespaces and old three-digit records.
- Failure/NFR: invalid tokens still reject; differently padded IDs remain separate; no empty-array workaround is accepted as complete machine trace.
- Verification: VER-006, integration — focused outcome schema and trace parse/graph tests plus real audit CLI parsing an isolated complete trace fixture/record. After dependencies are restored, use `rtk proxy node --import tsx --test scripts/outcome/schema.test.ts scripts/trace/parse.test.ts scripts/trace/graph.test.ts` and scoped `audit:outcome`/`audit:trace` consumer commands; tests alone do not prove kit behavior.

### SRS-007: Publish Only Portable Selected Resources
- Source/trace: REQ-001/003, AC-01/02/06 and BRD portability/privacy constraints → HLD-001 → CMP-001/003 → LLD-001/003.
- Statement/behavior: selected skill resources and workflow exports derive from canonical source through current generation, with host-neutral public content and applicable notices.
- Failure/NFR: no manual native mirrors, private target recipes or bypassed provenance conflicts; source publication is separate from runtime activation.
- Verification: VER-007, consumer-smoke — temporary consumer installs/discovers the selected source and all references through the existing export path; compare canonical/native IDs and resource parity. Run existing generation checks, not lexical copies, and retain baseline/with-skill eval obligations from common-skill-creator before claiming efficacy. No paid evaluation is authorized by this document.

## Implementation Verification Results

Observed repository-target evidence only. The bounded run exercised this repository's
existing kit against real local CLI/API entrypoints and disposable consumer state; it did
not exercise an external project or establish model efficacy. Latest parent run:
`artifacts/verification/agent-skills-standard/run-proof_incomplete-2026-11-06T03-46-33-063Z.json`
(`PROOF_INCOMPLETE`: 30 passed, 0 failed, 0 blocked, 1 unexercised, 3 manual); refusal
proof: `artifacts/verification/agent-skills-standard/refusal-proof_complete-2026-11-06T03-46-40-932Z.json`.
The SRS update changes the kit's canonical source pin; parent-owned final reproof after
pin refresh remains required. Exact ACs remain defined only in the approved PRD.

| Criterion (PRD reference) | SRS mapping | Observed evidence and boundary | Status |
| --- | --- | --- | --- |
| [AC-01](../prd/prd-pstack-verification-readiness.md) | SRS-001 | Kit discovery/reuse was manual; no fresh-agent rediscovery run | PARTIAL |
| [AC-02](../prd/prd-pstack-verification-readiness.md) | SRS-002/SRS-007 | Source contract reviewed; three journey maps exist. Scope limited to this repository | PARTIAL |
| [AC-03](../prd/prd-pstack-verification-readiness.md) | SRS-003/SRS-006 | Source contract and three maps retain canonical criteria/source identity; controlled freshness redrives are separately recorded | PARTIAL |
| [AC-04](../prd/prd-pstack-verification-readiness.md) | SRS-002 | Real trace/outcome CLIs and consumer install/discovery/doctor entrypoints ran; actions and side effects are in the raw artifact | PASS (repository scope) |
| [AC-05](../prd/prd-pstack-verification-readiness.md) | SRS-004 | Documentation drift and harness failure paths were exercised; product-regression branch was not exercised | PARTIAL |
| [AC-06](../prd/prd-pstack-verification-readiness.md) | SRS-005/SRS-006 | Source review and manual authority record only; actual `implementation-readiness` and `verify-work` execution was not demonstrated | PARTIAL |
| [AC-07](../prd/prd-pstack-verification-readiness.md) | SRS-004 | No genuine product regression was encountered; none was manufactured | UNEXERCISED |
| [AC-08](../prd/prd-pstack-verification-readiness.md) | SRS-001/SRS-005 | Missing-kit prerequisite was manually blocked; actual missing-driver refusal occurred before any drive | PARTIAL |
| [AC-09](../prd/prd-pstack-verification-readiness.md) | SRS-002 | Run evidence survived teardown byte-identically; owned consumer/scratch cleanup was observed | PASS (run scope) |
| [AC-10](../prd/prd-pstack-verification-readiness.md) | SRS-003/SRS-004 | Incomplete per-journey and manual coverage remained explicit; no blanket PASS | PASS (reporting behavior) |
| [AC-11](../prd/prd-pstack-verification-readiness.md) | SRS-002 | Owned temporary state was removed and retained proof remained intact | PASS (run scope) |
| [AC-12](../prd/prd-pstack-verification-readiness.md) | SRS-003/SRS-005 | Parent manually accepted actual consumed-input deltas/redrives; no automatic freshness enforcement is claimed | PARTIAL |
| [AC-13](../prd/prd-pstack-verification-readiness.md) | SRS-004/SRS-007 | Root-attribution recipe correction was redriven; root `LICENSE` SHA-256 `4d7986336b20626e0f4b37bdcd8010f718856bdf0fecb11f40dfdd5f705d49e1` matched four installed files across two agents | PASS (repository scope) |
| [AC-14](../prd/prd-pstack-verification-readiness.md) | SRS-002/SRS-005 | Missing-prerequisite refusal was observed; wrong-build/port branch was not applicable or exercised | PARTIAL |

The corrected run receipt records 103,388 bytes with SHA-256
`4dd49251e23767ebe6f213cc5a75616bc8f93e4a4aeb6b7bcdb4d30156f6a4e2` unchanged after
cleanup; it removed only its owned consumer and scratch directories. The refusal receipt
also confirms retained bytes and zero drive actions. Parent's technical-owner assessment
records the manual freshness dispositions and accepts the scoped reproof; it does not
change the immutable `PROOF_INCOMPLETE` result.

Prior SRS-006 focused and covering test evidence and SRS-007 generation evidence remain
valid for their recorded source scopes; they do not promote any unexercised journey above
to PASS.

Evidence locations: `.agent/sdd/pstack-repository-verification/owner-assessment.md`,
`artifacts/verification/agent-skills-standard/run-proof_incomplete-2026-11-06T03-46-33-063Z.json`
and receipt, and `artifacts/verification/agent-skills-standard/refusal-proof_complete-2026-11-06T03-46-40-932Z.json`
and receipt. Independent reviewer approved bounded source, quality, and integration proof.
Human business acceptance, release, and deployment remain unassessed.

## Migration, Failure Analysis And Rollback

- **Kit references:** adopt the new convention only for a new kit; existing equivalents stay canonical and are linked. Move/retire an old recipe only with owner approval and re-proven consumer entrypoint. Never delete historical proof.
- **Acceptance-criteria identifier width compatibility:** scoped additive input acceptance, no stored-value rewrite. Update both formal validators and associated semantic fixtures together. Before that change, source IDs remain intact but current machine audits cannot certify them. Subsequent corrected receipts must link earlier limited receipts without falsely claiming that the historical audit passed.
- **Generation:** implementation uses `pnpm generate-indices` and applicable existing generation/export tests after source changes. Update ARCHITECTURE.md, CONTRIBUTING.md, quick reference and changelog as affected. Do not edit generated indices/native exports by hand. Shared generated outputs have one integration owner, not K/G worker overlap.
- **Rollback:** stop affected kit use when provenance or behavior is suspect; retain evidence and route defects separately. Revert gate/guidance changes through authorized source maintenance and regenerate. Reverting digit-width support knowingly blocks valid two-digit records; preserve their exact IDs rather than renumbering or pretending trace remains valid.
- **Tool/runtime absence:** record exact prerequisite and scope, not an automatic install or fallback. Earlier planning observed missing node_modules/tsx; no unchanged audit retry is proof. Project target authority remains explicit even after repository dependencies become available.
- **Trust/privacy:** kit Markdown and scripts are untrusted operational input, not permission grants. Review commands before execution, keep target data local/authorized, never drive an unowned instance, and separate independent review from implementation ownership. Host permission controls remain external.

## Execution Handoff And Readiness Boundaries

After design approval, offer Subagent-Driven (recommended) versus a justified Inline exception explicitly; prior PRD/design approval is not that selection. Preserve approved K/G/V slice boundaries and add tooling owner T for CMP-004. K (guidance), G (gate consumers) and T (formal-ID compatibility) can run concurrently against this fixed contract, with disjoint owned source files; integration/generation precedes independent V. Restore necessary local dependencies before executing the applicable checks; do not suppress them.

The project owner still selects/authorizes the exact consumer target and test data before its live proof. This does not block unrelated approved repository-source slices, but V cannot PASS without real consumer proof. Independent architecture/test-gap review is required at high tier; add independent security review for affected trust/permission controls. Human merge/release consent remains separate.

## Status And Receipt

- feature_status: partially_implemented (repository source delivered; independent source and package review APPROVE; no pilot/release authority).
- repository_status: approved SRS, accepted ADR-VER-001, delivered CMP-001/CMP-003/CMP-004 source, design walkthrough updated with observed results; activation_status: not_required.
- Design approval: approved(operator, 2026-11-05).
- Design and execution approval: approved(operator, 2026-11-05) covering this technical contract plus Subagent-Driven implementation of K, G and T.
- Run records: ../../artifacts/runs/pstack-verification-readiness/20261105T072631Z-design-solution.json and ../../artifacts/runs/pstack-verification-readiness/20261105T145617Z-implement-feature.json.
- Machine AC trace: exact AC IDs retained; following Task T completion (/^AC-\d{2,}$/), parent verified scoped audit:outcome PASS for design record 20261105T072631Z-design-solution. Historical planning failure remains recorded as historical. The integration record carries the same exact AC-01–14 tokens and is bound to the frozen source digests.
- Generation-owned outputs (indices, category `_INDEX.md`, native host mirrors): declared in `.agent/sdd/pstack-verification-readiness/generation-owned-paths.json`. The generation contract suite is PASS 87/87. Current state: the plain apply and the bounded recovery were refused (retained as history), then a human-authorized disposable rehearsal proved the pinned-base producer reproduces the current bytes, and the released in-place `--adopt-base` run published 31 paths total: 30 generated outputs plus the ownership manifest, followed by a passing `--check`. Receipts: `artifacts/generation-logs/attempt-2026-11-05T15-16-29-210Z-b3b8c7/receipt.json` (status APPLIED, 14 adoption proof records) and `.agent/sdd/pstack-verification-readiness/generation-check-receipt-20261105T151736Z.json` (PASS).
- Remaining gates: business acceptance and release, which are not assessed. K, G and T component source reviews and the final source, quality and integration review are APPROVE. No human acceptance, release or deployment verdict is implied.
- Next workflow: verify-work for any authorized real-target verification; source implementation and generation are complete.
