
## Governed Cybersecurity Skills

Approved source: operator's request to implement the cybersecurity/evolution proposal using economical delegated models and deliver one PR with a carefully scoped changelog.
Slug: `governed-cybersecurity`; profile: technical. Sponsor/product owner: requesting operator; engineering, integration and verification owner: Main.
Objective 001: distribute useful security procedures without confusing instructions with authorization or measured control effectiveness.
Objective 002: evolve reviewed capabilities from reproducible evidence rather than automatic self-modification.

### Requirements and acceptance contract

All requirements are P0, approved for implementation; corresponding SRS IDs use the same suffix.

| Requirement | Acceptance criteria | Owner | Verification lane |
| --- | --- | --- | --- |
| Requirement 001: complete packages | AC 001: sync includes applicable root LICENSE/NOTICE and package resources; a missing required downloaded resource fails the skill without replacing its existing installation; unsafe paths are rejected; resource bytes are preserved. | Terra transport | CLI sync regression tests and temporary-project smoke |
| Requirement 002: reproducible evidence | AC 002: reference/script/asset changes invalidate dependent with-skill evidence; snapshots detect content tampering; historical v1/v2 runs remain verifiable but legacy evidence without resource provenance cannot establish current whole-package promotion. | Terra provenance | root eval and portable verifier regression tests |
| Requirement 003: curated capability pack | AC 003: eleven original compact skills cover shared authorization/evidence/mapping, blue triage/detection/hunting, white control/adjudication, red planning/scoped validation and purple detection validation; each has meaningful positive/negative and pressure eval cases. | Luna authors | schema, alignment, trigger and live scenario checks |
| Requirement 004: truthful boundaries | AC 004: active operations require documented authorization and demonstrated runtime controls; absent support blocks execution, not safe offline analysis; production modifications are gated for every team; no claim that Markdown enforces permissions. | Luna authors/Main | missing/expired scope and unsupported-runtime scenarios |
| Requirement 005: governed evolution | AC 005: learning separates proposals, authorized edits, independent review and promotion; redaction and provenance precede persistence; root causes distinguish routing, procedure, tooling, evaluator and environment faults; no self-approved promotion. | Main | retrospective/evolution pressure scenarios |
| Requirement 006: portable distribution | AC 006: cybersecurity is discoverable and opt-in; generated indexes and release tag routing include it; non-trigger metadata is retained where supported; unsupported restrictions are documented, never silently advertised as enforced. | Main/transport | CLI router/export checks, release tag validation, sync smoke |
| Requirement 007: evidence-led workflows | AC 007: canonical blue/white/purple workflows compose skills; pentest preserves suspected/blocked/not-tested evidence without labeling it confirmed; existing security evidence conventions remain canonical. | Luna authors/Main | workflow validation and scenario review |
| Requirement 008: single reviewed delivery | AC 008: one feature branch/PR contains scoped changelog, architecture/contributor guidance, verification evidence and explicit operational limitations; no publish/tag/deploy action. | Main | final diff/review and GitHub PR |

### SRS / parallel contracts

- Preserve ADR-005: registry/sync/validation only; host runtimes enforce tools, credentials, filesystem/network scope and cancellation.
- Existing skill permission/risk declarations remain the contract; do not invent an incompatible team-color risk scale.
- `skills/cybersecurity/` owns eleven `cyber-*` skills; team roles are views, not duplicate category hierarchies.
- Shared skill IDs: `cyber-authorization`, `cyber-evidence`, `cyber-framework-mapping`.
- Blue/purple IDs: `cyber-incident-triage`, `cyber-detection-engineering`, `cyber-threat-hunting`, `cyber-detection-validation`.
- White/red IDs: `cyber-exercise-control`, `cyber-exercise-adjudication`, `cyber-engagement-planning`, `cyber-scoped-validation`.
- Each skill uses <=100 lines, specific keyword triggers (no broad file autoactivation), lazy references, valid existing eval JSON and at least three distinct scenarios plus trigger negatives.
- Shared evidence fields: engagement/scope reference, skill/version/source, observation time, finding status (`confirmed`, `suspected`, `blocked`, `not-tested`, `false-positive`), evidence references, limitations and accountable owner.
- Framework edges record framework/version/ID/relation/rationale/source/review status. Empty/unknown mappings stay explicit; catalog mapping never implies efficacy/compliance.
- No copied third-party skill bodies/scripts, real targets, credentials, live malware, exfiltration or operational attacks. Reference upstream primary documentation and preserve attribution where material is adapted.
- Authoring agents own disjoint directories/workflows only. Main owns metadata, generated indexes, release wiring, common evolution, pentest, docs/changelog, integration and PR.
- Parallel agents skip formatters/linters/builds/test execution to avoid cross-edit races; Main runs focused and integrated validation after edits settle. They add regression tests before implementation where applicable and report exact commands/test intent.
- No authenticated approval service, production deployment, cryptographic signing infrastructure or SIEM credentials are supplied. Deliver honest registry contracts and offline verification; do not claim a production exercise or measured analyst-time improvement.
- Skill package hashes are integrity/provenance evidence, not a signature of trusted origin. Historical evidence is never rewritten to pass new gates.

### Delivery evidence

Implementation is on `feat/governed-cybersecurity-skills`; delivery is one draft PR. Transport/evidence code, builds, regression suites and package smoke passed. The latest completed 14-skill run is retained without rewriting failed grades. Four final guidance corrections remain blocked on a live rerun because Codex reports exhausted workspace credits; no acceptance, release or promotion is claimed for those corrections. Exact commands, scores, evidence paths and resumption instructions are recorded in [the walkthrough](srs-walkthrough.md#governed-cybersecurity-delivery--2026-09-22).
