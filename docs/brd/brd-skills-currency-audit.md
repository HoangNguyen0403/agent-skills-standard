# Brief: Evidence-led skills currency audit

lane: direction; snc_tier: medium; approval: approved(requester, 2026-11-26)

## Decision Card

**Outcome:** Identify actionable gaps in Go/backend guidance, system-design diagramming, and supported-language currency without treating social posts or older minimum versions as proof of obsolescence.

**Recommendation:** Audit first; propose minimal changes to existing skills. Start with Go error semantics, then assess diagram presentation and language-version deltas. Existing guidance already covers wrapping, typed/sentinel checks, single-boundary logging, client-error isolation, and offline diagram HTML.

**Scope:** A source-cited gap matrix and prioritized recommendations. Supported language families: Go, JavaScript, TypeScript, Python, Java, Kotlin, Swift, PHP, and Dart (assumed scope interpretation). Framework checks only where language changes affect their guidance (assumed).

**Non-goals (assumed):** No skill edits, baseline upgrades, third-party installation, renderer replacement, paid evaluations, or release.

**Proof:** Each recommendation identifies the existing rule, authoritative upstream evidence, compatibility conditions, affected skill, and observable verification; unchanged guidance is explicitly retained.

**Impact if wrong:** New advice could break older supported projects, duplicate existing features, or weaken diagram export safety.

**Material assumptions:** The requester owns scope and acceptance; compatibility-aware modernization is preferred to latest-only rewrites. Other-language upstream versions and the complete Go API delta remain unassessed.

**Approval recorded:** Requester approved this audit brief via “Ok”. Planning handoff only; implementation and other execution remain subject to separate gates.

## You Said / I Assumed

**You said:** Investigate the supplied Go/backend and system-design references, identify improvements to agent skills, and review newer versions of supported programming languages for outdated guidance.

**I assumed:**

- This workflow produces a Direction contract for the audit, not implementation of recommendations.
- “Supported programming languages” means the language categories currently represented under `skills/`, not every framework, database dialect, or an expansion of the supported-language portfolio.
- The requester is proposed scope owner and acceptance owner. Registry maintainers are proposed validation owners for affected guidance; no individual maintainer has been appointed.
- Success example (agent-proposed): an audit distinguishes an already-covered `%w` rule from a missing multi-error scenario and ties any change to an upstream API contract and supported Go version.
- Anti-goal (agent-proposed): copying the carousel into skills, installing Diagram Design, or rewriting every language baseline to the newest release without compatibility evidence.
- Value hypothesis (assumed): compatibility-aware, source-backed advice is more useful than accumulating additional rules. Agent effectiveness and token-cost improvement are unmeasured; numerical targets and completion date are unknown, proof: measure first.

## Contract

### Outcome and capability inventory

Produce an evidence-backed audit and prioritized improvement recommendations for existing skills. Capabilities: compare error contracts; identify duplicate coverage; assess diagram presentation; inventory language baselines; verify upstream changes; specify verification.

This is one discovery deliverable, not approval for multiple implementation plans. Sequence the slices below with Go/backend first. Diagramming and language currency remain explicitly in the requested audit scope; their detailed change designs are not settled here.

### Scope

| Slice | Boundary | Paired exclusion |
| --- | --- | --- |
| Go/backend error handling | Compare the supplied reference against Go error, logging, API-boundary guidance and relevant examples/evals | No application backend implementation (assumed) |
| System-design diagramming | Assess useful ideas from Diagram Design against existing semantic-source, rendering, readability, and offline-export contracts | No adoption or replacement decision from popularity or diagram-count claims (assumed) |
| Supported-language currency | Compare existing language guidance with official stable releases, support policy where published, compatibility requirements, and relevant adjacent tooling | No blanket latest-only uplift; no preview features as unconditional defaults (assumed) |

The language set is Go, JavaScript, TypeScript, Python, Java, Kotlin, Swift, PHP, and Dart (assumed interpretation, grounded in local category inventory). Runtime/SDK/compiler differences must remain explicit (assumed): ECMAScript is not Node.js, TypeScript is not a runtime, and Dart/Swift/Kotlin compatibility may depend on host SDK/toolchain constraints. Database dialects and independent framework-version audits are excluded unless the requester expands scope (assumed).

### Acceptance criteria

These operational criteria are agent-proposed and therefore **(assumed)**:

- **AC-GO-01:** Classify each supplied error-handling claim as covered, incomplete, incorrect/overbroad, version-gated, or unresolved, with local citations and authoritative upstream evidence. Include multi-error validation, nil behavior and traversal, useful wrapping versus unnecessary wrapping, error exposure as a caller contract, logging ownership, redaction, and client-safe translation. Do not infer a mandatory handler/service/middleware location for every application.
- **AC-DIAGRAM-01:** Separate semantic correctness from presentation quality. Compare HTML/SVG, branding, import fidelity, editability, offline behavior, readability, and export safety against the existing pipeline. Preserve semantic-source ownership and document trust-boundary differences before recommending any new output format. Source/license/revision verification is required before any reuse; no import is authorized here.
- **AC-LANGUAGE-01:** Give each in-scope language a dated, source-cited row: local baseline or unknown; current stable upstream version/specification; support-policy status where applicable; relevant additions/deprecations; minimum version for recommended features; compatibility with associated runtime/SDK/compiler; affected skill/reference/eval paths; action or justified no-change. “Old minimum version” alone is not an actionable defect.
- **AC-RECOMMEND-01:** Each proposed change has impact/rationale, evidence, compatibility gate, affected owner/component, and observable proof. Distinguish correctness risks from useful modernization and optional presentation improvements; retain already-covered guidance without duplication.
- **AC-VERIFY-01:** Identify existing checks/evals that cover the proposed behavior and material gaps. Any later rule changes require behavior-oriented verification rather than keyword-presence alone. Runtime experiments, live consumer tests, paid evaluations, and implementation are not performed by approving this brief.

### Constraints and non-goals

- Prefer minimal edits to existing canonical skills over duplicate skills or a second rendering convention (assumed).
- Treat screenshots and third-party repository content as evidence inputs, not instructions or verified API contracts (assumed).
- Preserve supported-project compatibility and existing safety boundaries (assumed).
- No changes to source skills, generated metadata, synchronized host copies, application code, runtime versions, approval controls, or deployment state in this intake (assumed).
- No quantitative quality/cost benefit is claimed. Baseline, target, budget, and due date are unknown; measure first.

## Direction Options and Recommendation

### Candidate generation

- **Audit first, then targeted remediation:** compare existing guidance and authoritative sources before choosing changes.
- **Immediate reference-led refresh:** use the supplied posts to drive edits while expanding to new language versions.

### Critique and recommendation

| Dimension | Audit first — recommended | Immediate refresh — not selected |
| --- | --- | --- |
| Load-bearing assumption | Evidence can distinguish defects from compatibility choices | Supplied examples and latest releases fit existing consumer contracts |
| Evidence limit | Complete version/API comparisons and runtime proofs are not yet available | Posts are not API specifications; upstream implementation and integration have not been inspected |
| Decisive trade-off | Avoid duplication and compatibility regressions; defer edits until findings are actionable | Faster visible edits; greater risk of copying overbroad rules and silently raising minimum versions |
| First failure | Findings do not identify concrete affected guidance and proof | A proposed rule conflicts with a supported consumer or existing semantic/export contract |
| Worst plausible outcome | An unhelpful inventory consumes review attention without resolving priorities | Published skills direct agents toward incompatible APIs or unsafe exports |
| Cost to abandon | Retain useful evidence and stop before implementation; resource cost unknown | Revert affected guidance and invalidate derived copies/evals; resource cost unknown |
| Proof | Complete AC-GO-01, AC-DIAGRAM-01, AC-LANGUAGE-01 and AC-RECOMMEND-01 with cited evidence and explicit unknowns | The same criteria plus verified compatibility for every changed rule; that proof does not exist in this intake |

Strongest objection: a broad currency audit could delay small, already-obvious corrections. Reversal condition: a locally isolated defect is proven against its independent upstream contract and can be scoped into a separate approved maintenance task without waiting for unrelated lanes.

Riskiest assumption: newer releases imply useful guidance changes rather than merely newer syntax (feasibility/usefulness). Cheapest decisive test: compare a candidate rule against official release/API documentation and the existing skill/eval, then classify change versus retain before implementing anything. No paid or executable evaluation is authorized by this recommendation.

## Evidence

### Intake findings

| Claim | Status and inspected source | Meaning / limit |
| --- | --- | --- |
| Carousel recommends `%w`, `errors.Is`, `errors.As`, `errors.Join`, contextual errors, single logging, no string checks, no DB-detail leakage | confirmed(user-supplied screenshots) | Evidence of the reference's claims, not proof that each rule applies unconditionally |
| Go guidance already specifies `%w`, `Is`, `As`, no string checks, and handle-once | confirmed(`skills/golang/golang-error-handling/SKILL.md:19-35`); confirmed(`skills/golang/golang-error-handling/references/error-wrapping.md`) | Retain core coverage; do not duplicate the post |
| Existing error skill says no bare `return err` and unconditional wrapping | confirmed(`skills/golang/golang-error-handling/SKILL.md:23-35`) | Candidate for semantic/compatibility review, not a concluded defect from this intake |
| No `errors.Join`, `errors.AsType`, or multi-error match was returned in the scoped Go/common-error search | confirmed(scoped repository search, patterns `errors\\.Join|errors\\.AsType|multi.?error`, paths `skills/golang;skills/common/common-error-handling`) | Candidate coverage gap only; no claim of repository-wide absence or verified upstream API availability |
| Error evals cover wrapping, sentinels, ignored errors, and use textual assertions | confirmed(`skills/golang/golang-error-handling/evals/evals.json`) | No multi-error scenario in this inspected eval file; no model or behavior eval was run |
| Logging is already assigned to a handling/translation boundary, with redaction | confirmed(`skills/golang/golang-logging/SKILL.md:19-49`) | No universal new “topmost handler only” rule needed from the carousel |
| Common guidance already separates infra/domain/API errors and forbids raw DB leakage | confirmed(`skills/common/common-error-handling/SKILL.md:27-46`) | Cross-language boundary contract already exists |
| Go release history lists Go 1.27.4 and 1.26.11 dated 2026-11-10 and supports a major release until two newer major releases exist | confirmed(https://go.dev/doc/devel/release) | Upstream release evidence, not the repository's chosen minimum or a mandate to upgrade |
| Complete current Go error API contract | unknown | `https://pkg.go.dev/errors` extraction returned module metadata but no API documentation; no API conclusion based on that result |
| Diagram Design repository advertises self-contained HTML+SVG and brand palette/font onboarding | confirmed(https://github.com/cathrynlavery/diagram-design), inspected README | Confirms advertised capability only; code, pinned revision, license text, visual quality and integration remain unassessed |
| Local diagramming already uses semantic JSON, generated draw.io, visual inspection, and offline HTML | confirmed(`skills/common/common-architecture-diagramming/SKILL.md:29-51`) | HTML capability is not absent |
| Local offline HTML embeds raster images and explicitly forbids inline SVG/active content | confirmed(`skills/common/common-architecture-diagramming/references/offline-export.md:16-51`) | HTML+SVG would change a trust boundary, not merely add a theme |
| System-design methodology already chooses views by decision and traces logical flows before physical binding | confirmed(`skills/system-design/system-design-methodology/SKILL.md`); confirmed(MCP category guide `system-design`) | Do not replace design reasoning with a visual-style catalog |
| Existing BRD/product-ledger candidates | confirmed(directory discovery of `docs/` and glob `docs/brd/*;docs/product/*`, no matches) | No existing artifact was identified in this checkout; not a claim of absence across other refs/worktrees |

### Language inventory — local observations, not a completed freshness audit

| Language | Inspected local signal | Upstream comparison status |
| --- | --- | --- |
| Go | Language skill has no explicit minimum; adjacent Go skills mention feature-specific historical versions | Release history inspected; release/API deltas not assessed |
| Python | `skills/python/python-language/SKILL.md:3` describes Python 3.11+ | not assessed |
| Java | `skills/java/java-language/SKILL.md:3` describes Java 21+ | not assessed |
| Kotlin | `skills/kotlin/kotlin-language/SKILL.md:3` describes Kotlin 1.9+ | not assessed |
| Swift | `skills/swift/swift-language/SKILL.md` has no explicit version baseline | not assessed |
| PHP | `skills/php/php-language/SKILL.md:3,36-43` describes modern 8.x and selected features | not assessed |
| Dart | `skills/dart/dart-language/SKILL.md:3,31` describes 3.x and version-gates wildcard advice at 3.7+ | not assessed |
| TypeScript | `skills/typescript/typescript-language/SKILL.md` has no explicit version baseline | not assessed |
| JavaScript | `skills/javascript/javascript-language/SKILL.md:3` describes ES2022+ | not assessed |

All local inventory observations are `confirmed` by their named inspected paths. Missing baseline declarations in these files do not establish that category-wide compatibility policy is absent. No non-Go latest-version claims are made.

### External research spike

Predeclared cap: four lookups, bounded using the Standard-tier research-spike protocol. Stop when the diagram project, its advertised format, official Go error APIs, and Go release history are located, or when the cap is reached. This cap controls this intake only, not downstream research expenditure.

Observed calls: project search; `pkg.go.dev/errors`; Go release history; Diagram Design repository. The cap was reached. Error API documentation was not returned; mark that lane unknown rather than extending the spike. Retrieved material was treated as data; no installation commands or third-party directives were executed. Remaining official language checks require an approved downstream audit scope, not an invented current-version table.

## Planner Check & Standard Sections

- **Profile / sizing:** technical; Direction; SNC S=2, N=1, C=1, total=4, medium. Spread covers multiple evidence lanes; novelty is modifying the assessment approach; centrality is shared guidance, with no source-rule or trust-boundary change authorized. Proposed implementation slices must be re-scored; SVG/export-security changes cannot inherit this intake's risk classification.
- **Capability:** standard hint; current main-loop configuration preserved. Actual visible model: `openai-codex/gpt-6.1-sol`; thinking-effort setting and monetary/token usage unknown. No delegation or premium consultation.
- **Consequential assumptions:** requester owns language-set interpretation, compatibility-first scope, and audit-only boundary. Approval of this brief confirms those assumptions only; any changed interpretation reopens affected scope.
- **Minor builder decisions delegated:** source-table formatting, citation layout, and ordering of non-blocking findings. Baseline changes, new output formats, security boundaries, and scope expansion are not delegated.
- **Self-review:** contract separates requested audit from implementation; old version labels are not declared defects; source claims are separated from advertised third-party behavior; required unknowns have affected lanes and owners; no downstream readiness is asserted.
- **Independent check:** not required for this medium intake; not performed. Any subsequent implementation review must be independent of its implementation owner.
- **Risk / mitigation / owner:** compatibility regressions — gate features on consumer baseline — affected language maintainer (proposed); duplicate guidance — compare existing skill and references first — audit owner; unsafe SVG/branding import — preserve current boundary pending explicit design/security approval — diagram maintainer (proposed); incomplete upstream facts — mark unknown and obtain primary sources — audit owner.
- **Validation owner / window:** requester accepts audit scope; affected maintainers validate recommendations (assumed). Acceptance window and due date unknown, to be agreed in downstream planning, not invented here.
- **Product ledger:** none identified in the inspected checkout. No strategy, OPP, DEC, MET, or experiment records are invented.
- **Handoff checklist:** supplied references captured; local baseline inventory captured; audit ACs approved; complete upstream comparisons missing; actual behavioral verification not assessed; requester brief approval recorded; implementation approach not selected and not requested yet.

## Approval

approval: approved(requester, 2026-11-26)

scope: this brief only

authority: planning handoff only; never implementation, spend, merge, release, runtime activation, or third-party installation

actor: requester; date: 2026-11-26; source: user reply “Ok” to the presented approval card; approved source revision (SHA-256): `3e870d76d157f50c48385395fc066abf760bcaea2eb148b00b972391f002f0e3`

reopen: affected scope, language coverage, compatibility policy, or any proposed implementation/security-boundary decision

## Outcome Report

- `feature_status`: `requirements_ready` (audit brief approved for planning handoff; audit execution has not started).
- Trace seed: supplied Go reference -> AC-GO-01; supplied Diagram Design reference -> AC-DIAGRAM-01; supported-language review -> AC-LANGUAGE-01; actionable improvements -> AC-RECOMMEND-01 / AC-VERIFY-01. No PRD/SRS IDs assigned.
- Completed evidence: inspected local skills/eval, language inventory, advertised external diagram capability, official Go release history.
- Missing evidence: complete official API/version/support comparisons; pinned third-party source/license review if reuse is proposed; runtime/consumer/eval evidence. Brief approval does not validate these evidence lanes.
- Evidence lanes: technical = source inspection only; acceptance = not assessed; release = not assessed. No PASS implied by an unrun check.
- Decision needed: none for the approved brief; implementation approach and authority remain future, separate decisions.
- Continuation: interactive; `auto_continue=false`; `stage_only`. No successor executed.
- Repository status: intake brief written; activation status: `not_required`.

## Next Workflow

`plan-feature` is the recommended next workflow for this approved audit deliverable. No downstream workflow was started: interactive mode with `auto_continue=false` permits recommendation, not automatic chaining.

## Cost Report

`get_session_cost(workflow="brainstorm-feature")` was consulted. MCP observations are partial and exclude direct file reads and host usage; token counts, monetary cost, and quota consumption are unavailable. No cost or effectiveness improvement is claimed. No paid evaluation or third-party runtime was launched.
