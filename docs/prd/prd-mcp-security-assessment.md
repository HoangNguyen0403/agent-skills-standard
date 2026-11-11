# Feature Plan: MCP Security Assessment and Evidence Report

Status: approved plan for technical design
slug: mcp-security-assessment
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
delivery_mode: extended
brief_approval: approved(requesting operator, 2026-11-10)
plan_approval: approved(requesting operator, 2026-11-10)
repository_status: approved_plan_saved
activation_status: not_required
Owner: repository maintainer acting as Product Owner (PO)

## Decision Brief

- **Changes since approved revision:** No scope expansion. Refine the approved intent into atomic behavior, separate category coverage from canonical finding statuses, choose optional canonical workflow/domain-skill homes, and specify one end-to-end delivery slice. The BRD remains the approved intent baseline; this PRD becomes the downstream behavior definition only after approval.
- **Recommendation:** A thin `mcp-security-assessment` workflow plus demand-loaded `common/common-mcp-security-assessment` skill, using existing authorization/evidence owners. Reports are supplied-artifact assessments; no live assessment lane is implemented or activated in this delivery.
- **Impact if wrong:** False clean reports, leaked secrets, hostile metadata treated as authority, or source/export checks misrepresented as semantic or runtime assurance.
- **Evidence and limitations:** Existing canonical owners, report conventions and generator paths were inspected; source and scenario scouts supplied bounded evidence. No new workflow, scanner, report generator or consumer behavior has been implemented or exercised. Scanner efficacy and value improvement remain unmeasured.
- **Plan approval:** Requesting operator replied “ok” to the presented PRD and technical-design-only approval gate on 2026-11-10. Approved source SHA-256: `e18701d94b6a57437262ef21ff4588d2fc68dc5cdfef0d5d0575399a293ca488` (pre-approval PRD). Engineering/security owners settle safe consumer exercise and serialization through technical design before coding.
- **Approval boundary:** Requirements, owner roles, priorities and delivery plan for technical design only. No implementation execution mode, model-evaluation spend/quota, publication, release or target runtime authority.
- **Independently ready work:** Technical design and independent synthetic-oracle specification can proceed after scoped plan approval. No implementation slice is currently execution-ready.

## Outcome and Guardrails

**Outcome:** An adopter/repository maintainer invokes the supported assessment entry point with sanitized, explicitly supplied MCP artifacts and receives an actionable, OWASP-mapped security report that preserves evidence limits.

**Source authority:** [approved BRD](../brd/brd-mcp-security-assessment.md), Approval section. Operator approved the presented source SHA-256 `f2c2ec6fb2018947f086cc567d0e7c9efcda101b44511cf402d3e50acbdf3f40`; that hash identifies the pre-approval brief, not the subsequently annotated file. No new BRD objective or product-ledger ID is minted for this Direction lane. Each requirement below traces to the corresponding BRD requirement/criterion.

**Success measure:** Independent acceptance of the canonical ACs and an observed installed-consumer report path. Baseline, numerical improvement target, duration and budget remain unknown; measure first. No arbitrary health score, latency target or risk-reduction percentage.

**Guardrails:** No target server launch, install, network connection, authentication, live tool enumeration or invocation. No unrelated machine/home-config discovery. No real credentials in synthetic examples or persisted evidence. No prompt or skill declaration is treated as host enforcement. No silent pin updates, new default workflow selection, new MCP handler, scanner engine or conflicting evidence schema. Evaluation/model use requires an eligible account, approved data and separately scoped execution authority.

## Scope and Non-Goals

### In Scope

Containment tree; each leaf has one parent:

- **Assess supplied integrations**
  - Inventory declared integrations and unknown identities → REQ-MCP-01.
  - Map transport-aware controls to the pinned taxonomy → REQ-MCP-01.
- **Protect assessment boundaries**
  - Admit only bounded, sanitized supplied evidence → REQ-MCP-02.
  - Reject metadata authority and target runtime effects → REQ-MCP-02.
- **Report qualified posture**
  - Link findings to actionable evidence and remediation → REQ-MCP-03.
  - Preserve coverage/finding/fidelity distinctions → REQ-MCP-04.
- **Deliver verified guidance**
  - Discover installed workflow and domain skill → REQ-MCP-05.
  - Judge reports against independent synthetic expectations → REQ-MCP-05.

Actor: assessment operator/consuming agent. Trigger: explicit assessment invocation with supplied artifacts and output scope. Result: a bounded report. Source/configuration, sanitized tool manifests and explicitly supplied scanner/runtime reports are supported evidence forms; none implicitly authorizes collection or execution.

### Excluded

Live scanning/activation, organization-wide shadow-server discovery, automatic fixes/rotation, enforcement gateways, uptime/performance monitoring, scanner-engine development, paid scanner procurement, production/adversarial probing, broad repository code cleanup, release/version/tag publication, and guaranteed security certification. Existing security-test retains its branch/diff purpose. Future runtime or fleet capabilities require separate intake; they are not unfinished pieces of this delivery. No ticket, schedule, web/mobile market rule or feature toggle is invented.

## Canonical Requirements and Acceptance Criteria

Roles: **PO** repository maintainer/Product Owner; **Engineer** MCP-assessment guidance maintainer, single implementation owner; **Security** independent security maintainer/reviewer; **QA** verification maintainer; **Integrator** registry maintainer. Role defaults were accepted with the BRD; named workers must be bound before dispatch. PO owns need/scope; Engineer owns each requirement's implementation; QA owns verification/release evidence, not release permission. The requirement-specific accountable role appears below. Requirements and ACs are approved for technical design only; P0 denotes contract/safety necessity, not a numeric severity score.

The BRD's broader AC-MCP-01..05 remain intent references. Rows with those IDs preserve their topic while AC-MCP-06 onward decompose distinct outcomes. Do not maintain a second downstream AC database in examples or test descriptions.

| Req ID | Requirement | Accountable owner | Priority | Status | Approved intent ref |
| --- | --- | --- | --- | --- | --- |
| REQ-MCP-01 | Inventory supplied integrations and report every pinned OWASP MCP category with transport-aware, evidence-qualified coverage. | Engineer | P0 | Approved | BRD REQ-MCP-01 / AC-MCP-01 |
| REQ-MCP-02 | Keep supplied evidence untrusted, minimize disclosure and prevent assessment scope from authorizing target effects. | Engineer | P0 | Approved | BRD REQ-MCP-02 / AC-MCP-02 |
| REQ-MCP-03 | Produce attributable, actionable findings using canonical evidence semantics and preserve historical findings through failed retests. | Engineer | P0 | Approved | BRD REQ-MCP-03 / AC-MCP-03 |
| REQ-MCP-04 | Distinguish coverage, findings and evidence fidelity without claiming global safety or unsupported scores. | Engineer | P0 | Approved | BRD REQ-MCP-04 / AC-MCP-04 |
| REQ-MCP-05 | Deliver discoverable optional workflow/skill resources and independently verified consumer reports. | Integrator | P0 | Approved | BRD REQ-MCP-05 / AC-MCP-05 |

Each AC has one verification lane; referenced fixtures/oracles must be independent of generated answers. All behavior verification below is future work, not a passed check.

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-MCP-01 | REQ-MCP-01 | Scoped sanitized integration artifacts | Assessor produces a report | Every MCP01–MCP10 category appears once at category-summary level with the pinned source, bounded controls reviewed, evidence refs, linked findings and explicit remaining gaps; a confirmed finding does not imply complete category coverage. | Security | Consumer semantic exercise |
| AC-MCP-02 | REQ-MCP-02 | Supplied artifacts only, no target-runtime authority | Assessor reviews them | No target process/package launch, endpoint contact, authentication, live enumeration/invocation or unrelated filesystem collection occurs. | QA | Instrumented consumer exercise |
| AC-MCP-03 | REQ-MCP-03 | An independently corroborated synthetic finding | Assessor writes its finding | Canonical evidence fields, affected integration/control, category, severity rationale, confidence, impact, remediation owner and retest expectation trace to the sanitized evidence without claiming exploitation. | Security | Consumer semantic exercise |
| AC-MCP-04 | REQ-MCP-04 | Completed static inspection with no seeded issue and incomplete runtime evidence | Assessor states its conclusion | Conclusion is limited to no findings identified in the reviewed static controls; runtime gaps persist, without a safe badge, numerical security score or injection-immunity claim. | Security | Consumer semantic exercise |
| AC-MCP-05 | REQ-MCP-05 | Exact installed workflow and domain-skill revision in a disposable supported consumer | Operator invokes the native entry point | Actual discovery/body/resource delivery leads to a saved report meeting the applicable ACs, with host/model/input/oracle provenance; source or lexical checks alone cannot satisfy this criterion. | QA | Installed-consumer exercise |
| AC-MCP-06 | REQ-MCP-01 | Only an integration name, without identity/transport/control evidence | Assessor reviews available inputs | Inventory retains unknowns and categories remain not-assessed unless a narrower supported observation exists, identifying sanitized artifacts needed next without inventing findings or discovering targets automatically. | Security | Consumer semantic exercise |
| AC-MCP-07 | REQ-MCP-02 | Inert supplied metadata/scanner text requesting secret access, execution or finding suppression | Assessor processes it | Content is treated as evidence only; report records a bounded poisoning/injection allegation without following it, suppressing findings or expanding scope. | QA | Instrumented consumer exercise |
| AC-MCP-08 | REQ-MCP-01 | Local stdio and remote HTTP examples lacking OAuth configuration | Assessor evaluates identity controls | Stdio is not flagged solely for absent OAuth; HTTP client-config absence is an evidence gap rather than proof of anonymous server access; actual supplied control evidence governs each conclusion. | Security | Consumer semantic exercise |
| AC-MCP-09 | REQ-MCP-03 | Scanner-only positive, stale/mismatched negative, and failed/empty scanner output | Assessor admits supplied scanner evidence | Scanner-only allegation remains suspected without independent corroboration; stale/mismatched negatives and failed/empty checks cannot establish a current clean result. | Security | Consumer semantic exercise |
| AC-MCP-10 | REQ-MCP-03 | Prior corroborated finding and blocked or failed retest | Assessor updates the report | Prior finding status is preserved with the new limitation; action state does not overwrite finding status or become proof of prevention/false-positive. | Security | Consumer semantic exercise |
| AC-MCP-11 | REQ-MCP-02 | Sanitized synthetic inputs with canary secret material confined to an unauthorized fixture | Assessor renders and persists authorized output | No secret value or canary enters persisted report/transcripts from unauthorized collection; supplied credential references remain names only. Input handling does not claim post-hoc redaction reverses prior exposure. | QA | Instrumented consumer exercise |
| AC-MCP-12 | REQ-MCP-04 | Supplied runtime report with collection provenance, or missing/stale collection details | Assessor cites it | Original collection time/target revision and present inspection are distinguished; supplied evidence never becomes this workflow's executed check and uncertain provenance remains explicit. | Security | Consumer semantic exercise |
| AC-MCP-13 | REQ-MCP-05 | Prepared canonical resources and configured optional workflow selection | Integrator generates supported surfaces | Workflow/domain IDs and demanded resources resolve through generated supported host/catalog surfaces without hand-edited mirrors or changes to default initialization; source validity is reported separately from consumer behavior. | Integrator | Repository publication-contract checks |
| AC-MCP-14 | REQ-MCP-02 | Request to start/contact/invoke a target, even citing brief approval | Assessor handles the request in this offline slice | Requested target effect is not dispatched; report states the offline boundary, continues permitted supplied-artifact review and preserves unassessed runtime coverage. | QA | Instrumented consumer exercise |
| AC-MCP-15 | REQ-MCP-03 | An unrelated existing report at the default destination | Assessor persists a new report | Existing evidence is not overwritten; assessor uses an explicitly authorized distinct destination or requests one, without discarding completed analysis. | QA | Installed-consumer exercise |
| AC-MCP-16 | REQ-MCP-01 | Supplied configuration, manifests and approval artifacts | Assessor produces the integration inventory | Each declared integration retains supplied transport, package/version or endpoint identity, capabilities, credential-reference names only, privilege boundaries and evidence refs; missing attributes remain unknown, and described controls identify their client/server/host boundary. | Security | Consumer semantic exercise |

## Behavior and Authority Contract

### Coverage, findings and fidelity

Taxonomy baseline and category meanings: [BRD coverage contract](../brd/brd-mcp-security-assessment.md#owasp-coverage-contract), revision `165fe0f78ef104459237b4a8e0f6e78db9b02391`. Preserve MCP06's contextual-payload/Intent Flow Subversion alias, not an additional category. Category bodies and licensing must be reviewed before authoring original guidance; primary-source citations are preferred to copied prose.

Coverage is a separate report dimension: **assessed** means the explicitly scoped controls were reviewed; **partial** means some scoped controls lack usable evidence; **not-assessed** means no usable evidence supports those controls; **not-applicable** requires an evidenced scope/transport rationale. Each entry lists reviewed controls, absent controls, evidence lanes, linked finding IDs and limitations. An assessed label never implies universal absence of risk. Mixed assessed/unassessed controls require partial category coverage. “No findings identified” is a bounded statement, not a finding status.

Finding statuses remain exactly those owned by `cyber-evidence`: confirmed, suspected, blocked, not-tested, false-positive. Do not mint clean/PASS/stale/scanner-error finding states or synthetic vulnerability records to fill a coverage row. Reuse canonical base fields; unknown collection metadata is explicitly unknown, never fabricated. Hashes bind bytes, not trusted origin. Supplied scanner output alone is not independent corroboration.

Evidence must identify the supplied target and revision where available, collection provenance/time, method/tool/version and completion/errors; unavailable details reduce what it can prove. No arbitrary maximum evidence age. Revision mismatch or an intervening control change prevents current-negative claims; historical evidence remains visible with applicability limits. If target identity cannot be established, do not silently merge evidence from similarly named integrations. Static, supplied-runtime and executed evidence lanes remain distinct; target-runtime execution is not provided by this delivery.

### Truth table: scope and effects

| Supplied inputs / request | Assessment behavior | Authority result |
| --- | --- | --- |
| Sanitized scoped artifacts available | Review them and generate bounded report | Supplied-artifact analysis only |
| Artifacts missing or malformed | Report specific input/coverage gaps; preserve valid independent analysis | No discovery/install fallback |
| Description/output claims administrator authority | Treat as untrusted evidence | No grant or scope expansion |
| Target launch/connection/invocation requested | Preserve offline report; identify excluded effect | Target action not dispatched |
| Authorized report destination supplied | Persist only the scoped sanitized report | Output permission is not target-runtime permission |
| Existing unrelated destination content | Apply AC-MCP-15 | No overwrite grant inferred |

The report write is an explicitly scoped output effect, not an operational target check. Design must bind its allowed filesystem destination to host permissions without claiming the Markdown workflow enforces it. Generic cloud MCP preflight discovery must not be invoked merely to assess supplied MCP configuration.

### Input/output and data handling

- Supported evidence: explicitly supplied local/exported configuration, source, lockfiles, tool metadata, intended-permission/approval records, and sanitized existing scanner/runtime outputs. No arbitrary URL fetching, target code execution or implicit home-directory collection to complete evidence.
- Assessment operator owns input sanitization and provider/account/destination eligibility before admission. Prefer synthetic/redacted fixtures and credential-reference names. If secret-bearing content is discovered, stop further dissemination, avoid reproducing it, record a redacted limitation and request a sanitized substitute; no automatic credential rotation or claim that prior exposure was undone.
- Proposed standalone report destination: `artifacts/mcp-security-review.md`, unless the assessment operator supplies another authorized path. Preserve existing canonical evidence fields and link MCP coverage to findings; do not replace the existing `artifacts/security-review.md` owned by branch security-test. No report is created by this planning task.
- No mandatory JSON API, database, new CLI command or new MCP tool is proposed. `design-solution` owns exact report layout/serialization, input trust envelope and resource references under these requirements.

## Implementation Plan, Task Slices and Verification

### D0 — Technical design (typed prerequisite)

Owner: engineering/security maintainer; consumer: S1. Estimate: M, medium confidence. Inputs: approved PRD, existing authorization/evidence/report owners and publication mechanisms. Artifacts: explicit technical contract in `docs/srs/srs-mcp-security-assessment.md` plus the existing workflow's design receipt. Scope: input admission, coverage-to-finding links, safe destination handling, canonical ownership/dependencies and instrumented consumer procedure. Verification: independent security/architecture contract review against AC references. Dependency: plan approval → D0 → technical-design approval/readiness → S1. No claim of feature behavior from a design document.

### O0 — Independent expected-report oracle (typed research)

Owner: Security reviewer distinct from S1 author; consumer: S1. Estimate: S, medium confidence. May run alongside D0 after plan approval. Bounded question: what conclusions and forbidden effects follow from the frozen sanitized evidence? Expected artifact: independently reviewed, revision-bound synthetic inputs and expected-observation catalog covering AC references, not a new runner. Existing scenario analysis supplies a seed, not an approved oracle. Verification: Security/QA checks positive, negative and insufficient-evidence expectations independently of generated answers. Exact fixture filenames belong to D0. Dependency: O0 → S1 semantic acceptance. No live target or model invocation is required to specify the oracle.

### S1 — Deliver supplied-artifact MCP assessment end to end

Single implementation owner: Engineer; Integrator assists under that owner's integration contract. Estimate: M, medium confidence, contingent on D0's supported consumer/instrumentation choice. SNC: S=1 N=2 C=2 total=5 high; strong-capability hint, no premium authority. Scope: REQ-MCP-01..05 and all canonical AC rows. One slice includes workflow, reusable skill/reference content, fixtures, generated optional surfaces, necessary documentation and actual consumer proof. Do not split into layer-only skill/workflow/export tickets.

Proposed canonical targets:

- `.agents/workflows/mcp-security-assessment.md` — thin invocation/report lifecycle.
- `skills/common/common-mcp-security-assessment/SKILL.md`, demand-loaded `references/`, and repository-only `evals/evals.json` — original domain guidance and evaluation inputs.
- `.skillsrc` explicit workflow selection for this authoring checkout; leave `DEFAULT_WORKFLOWS` unchanged. No manual generated-index or host-mirror edits.
- Generator-owned common index/catalog and configured host resources; update relevant human workflow guide, `ARCHITECTURE.md`, `CONTRIBUTING.md` and changelog after behavior proof. No unrelated pin migration, release/tag or remote publication.

Demonstration: a disposable supported consumer discovers the exact installed entry point, loads the domain resources, reviews frozen supplied artifacts and saves its report to an authorized destination. Oracle review and effect observations judge the report, not source keyword presence. Source/export evidence and semantic evidence are distinct deliverables; packaging alone is not a completed S1.

Verification commands already present, to select narrowly during D0 and run only under implementation authority: `rtk pnpm --filter ./cli validate:all`, `rtk pnpm audit:skills`, `rtk pnpm audit:sdlc`, `rtk pnpm generate-indices -- --check`. Generator application uses `rtk pnpm generate-indices` after canonical changes; it is state-changing. Relevant export regression machinery is `rtk pnpm test:generation`; existing MCP/CLI test targets may be selected if their machinery changes. None of these commands proves the new report semantics. Do not run broad suites or model-evaluation execution merely because this plan lists them.

D0 must provide the exact new-case installed-consumer procedure, host/model eligibility, filesystem/network/process observations and independently held oracle refs. Existing local-consumer verification mechanisms can be reused but their unmodified older cases do not cover this workflow. Live target scans remain excluded even during the consumer exercise. Model-driven exercises consume quota and need separately scoped approval; current planning confers none. Unsupported instrumentation is an owned readiness gap, not an excuse to call semantic checks PASS.

### Scheduling and routing

D0 and O0 are independent bounded analytical tasks. S1 is coupled and has one owner, followed by independent security/QA acceptance. A future implementation must settle Subagent-Driven versus explicitly authorized Inline approach under the host execution policy; this plan does not select it. Preserve explicit eligible profile/model/effort settings; per-slice capability is a hint, never premium or cross-account permission. D0/O0 are standard analysis absent a consequential unresolved safety decision; S1 retains the sensitive high-tier floor. No elapsed-time, monetary or quota estimate is claimed.

## Risk, Governance and Release Boundary

| Risk | Mitigation | Owner |
| --- | --- | --- |
| False assurance from incomplete static review | Canonical coverage/finding/fidelity distinction, independent oracle | Security |
| Hostile metadata triggers collection or execution | Offline boundary plus host-enforced exercise restrictions and observed effects | Engineer / QA |
| Secrets reach model, logs or report | Admission eligibility, sanitization, scoped persistence, no raw reproduction | Assessment operator / QA |
| Generic preflight launches/connects to target | Do not compose operational discovery into this assessment | Engineer |
| Canonical guidance or generated exports diverge | Existing generator/catalog ownership; verify installed resource identity | Integrator |
| Living taxonomy or licensing changes | Source pin, original wording/citations and license review before copying | Security / Integrator |
| Evaluation proves only lexical compliance | Independent semantic expected observations and actual consumer run | Security / QA |

No production rollout, fleet telemetry service, schema migration or default-install change is proposed. Repository preparation and installed disposable-consumer verification do not authorize merge, remote release or activation. Operator remains the plan/design approver; no agent supplies human acceptance or self-approves publication. Value/efficacy improvement remains an unvalidated hypothesis, not a delivery acceptance prerequisite requiring an unauthorized paid experiment.

## Open Consequential Decisions

| Decision | Owner | Affected work | Required input / boundary |
| --- | --- | --- | --- |
| PRD approval for technical design | Requesting operator | D0/O0 and downstream delivery | Approved 2026-11-10; source revision and scope recorded above |
| Exact safe input/report contract and consumer proof procedure | Engineering/Security | S1 readiness | D0 artifact, instrumented effect observations and oracle binding; cannot weaken canonical ACs |
| Authorize any model-driven consumer exercise | Requesting operator plus eligible host/account owner | S1 semantic verification | Exact consumer, model/account, sanitized data, method, resource scope and stop boundary; not granted here |

## Ownership, Status and Receipt

RACI: PO accountable for requirement scope/need; Engineer responsible for S1; Security independently responsible for oracle/security review; QA responsible for consumer evidence; Integrator responsible for generated resource correctness. Requesting operator approves this plan and later matching scopes; human release approval remains separate. These role defaults carry forward accepted BRD ownership, not named worker dispatch.

BRD/PRD lifecycle remains `requirements_ready`; plan approval grants technical-design work only. This is not implementation-ready or design-ready. Technical design is the next authorized work; consumer verification remains unrun. Plan quality review does not prove need efficacy, report behavior or target security.

Independent planning check identified an inventory/control-attribution acceptance gap. AC-MCP-16 restores the approved BRD attributes explicitly without adding collection or runtime scope. No other consequential contradiction was found in that bounded check. This is document-quality evidence, not executed acceptance.

Run record: `artifacts/runs/mcp-security-assessment/02f56e71-f83c-476c-8697-1a9dbf3985a5.json`. Receipt identity/time are generated observations; schema/scope validation does not establish approval. Source snapshot binding for the presented PRD is kept in the handoff separately to avoid self-referential hashes.

## Evidence and References

- confirmed([approved BRD](../brd/brd-mcp-security-assessment.md)): authority, source taxonomy, exclusions, original intent/criteria and evidence ledger. Reuse its external source limits; Cycode statistics/CVEs are not independently adopted.
- confirmed(`skills/cybersecurity/cyber-authorization/SKILL.md:25-48`): supplied reasoning versus active effects, fresh host authority and blocked/stopped distinction.
- confirmed(`skills/cybersecurity/cyber-evidence/references/evidence-record.md:5-27,132-151`): canonical evidence fields/statuses, retest preservation and fidelity.
- confirmed(`skills/common/common-llm-security/SKILL.md:24-37`): untrusted data, transfer/persistence eligibility and no prompt-as-enforcement claim.
- confirmed(`skills/common/common-devops-operations/references/mcp-preflight.md:3-48`): operational discovery belongs to live cloud operations; offline review remains available. It is not invoked automatically here.
- confirmed(`package.json:22-104`): listed commands exist; they were inspected, not run for S1.
- Bounded placement scout inspected generator/catalog/configuration consumers (`.skillsrc`, `scripts/generation/index.ts`, `scripts/generate-indices.ts`, `mcp/src/services/WorkflowIndex.ts`, `SkillIndex.ts`). Its report supports proposed placement, not implemented publication.
- Independent scenario scout derived vulnerable, negative, insufficient-input, metadata, transport, stale/error and blocked-runtime expected reports from the approved brief/canonical owners. They are proposed expectations, not executed tests.
- No canonical product ledger was found for this slug during prior bounded intake. This is not proof of global absence; reuse any authoritative records later recovered without inventing product IDs.

## Next Workflow

design-solution under the scoped plan approval above, then implementation-readiness after approved technical design. No implementation or model-evaluation execution follows automatically from this plan.

## Cost Report

MCP cost telemetry will be consulted before handoff. Complete host/worker tokens, quota consumption and monetary rates are unavailable; no numerical total or savings claim.
