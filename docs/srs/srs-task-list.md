# Trustworthy 100% Skill-Eval Remediation Task List

Derived directly from `PLAN (2).md`; the plan is the approved scope for this implementation.

| Slice                                               | Plan trace                       | Status   | Evidence                                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V2 contracts and v1 adapter                         | Measurement and Artifact Repairs | complete | `scripts/evals/types.ts`, `scripts/evals/snapshot.ts`, root v2 tests                                                                                                                                                                                                           |
| Immutable historical inputs                         | Measurement and Artifact Repairs | complete | `benchmarks/evals/runs/all-v2.6.0/inputs.json`, `pnpm evals:verify -- --all`                                                                                                                                                                                                   |
| Shared manifest generation and paths                | Measurement and Artifact Repairs | complete | `scripts/evals/manifest.ts`, CLI/MCP v2 aggregate fixtures                                                                                                                                                                                                                     |
| Incomplete-run and compromised-arm gates            | Measurement and Artifact Repairs | complete | root v2 tests; canonical `evals-run` workflow                                                                                                                                                                                                                                  |
| Aggregate report projection                         | Correct reporting                | complete | `latestPerCategory` test; report shows 22 categories / 265 skills                                                                                                                                                                                                              |
| Assertion and trigger definition audit              | Eval and Skill Remediation       | complete | `scripts/evals/quality.ts`, `benchmarks/evals/eval-audit.json`                                                                                                                                                                                                                 |
| Remediation queue classification                    | Eval and Skill Remediation       | complete | `benchmarks/evals/remediation-queue.json` regenerated from `all-v2.6.0`; 55 current strict-scope items, with no compromised-generation classifications                                                                                                                         |
| Clean v2 live category/full-catalog reruns          | Final acceptance                 | complete | Canonical `all-v2.6.0` has 3,233/3,233 arms, zero compromised skills, immutable inputs/results, 265 skills across 22 categories, and passes run-level plus `--all` verification; report headline is baseline 42%, with-skill 72%, delta +30%, balanced trigger accuracy 96.88% |
| Skill guidance remediation and held-out paraphrases | Final acceptance                 | pending  | The 55-item remediation scope is covered by a verified 38-skill overlay with 38/38 strict-ready changed skills; the full catalog still has unchanged below-gate skills, and an independent held-out trigger-paraphrase dataset is not yet defined                              |

## Governed Cybersecurity Skills

Approved source: operator's request to implement the cybersecurity/evolution proposal using economical delegated models and deliver one PR with a carefully scoped changelog.
Slug: `governed-cybersecurity`; profile: technical. Sponsor/product owner: requesting operator; engineering, integration and verification owner: Main.
BRD-OBJ-CYBER-001: distribute useful security procedures without confusing instructions with authorization or measured control effectiveness.
BRD-OBJ-CYBER-002: evolve reviewed capabilities from reproducible evidence rather than automatic self-modification.

### Requirements and acceptance contract

All requirements are P0, approved for implementation; corresponding SRS IDs use the same suffix.

| Requirement | Acceptance criteria | Owner | Verification lane |
| --- | --- | --- | --- |
| REQ-CYBER-001: complete packages | AC-CYBER-001: sync includes applicable root LICENSE/NOTICE and package resources; a missing required downloaded resource fails the skill without replacing its existing installation; unsafe paths are rejected; resource bytes are preserved. | Terra transport | CLI sync regression tests and temporary-project smoke |
| REQ-CYBER-002: reproducible evidence | AC-CYBER-002: reference/script/asset changes invalidate dependent with-skill evidence; snapshots detect content tampering; historical v1/v2 runs remain verifiable but legacy evidence without resource provenance cannot establish current whole-package promotion. | Terra provenance | root eval and portable verifier regression tests |
| REQ-CYBER-003: curated capability pack | AC-CYBER-003: eleven original compact skills cover shared authorization/evidence/mapping, blue triage/detection/hunting, white control/adjudication, red planning/scoped validation and purple detection validation; each has meaningful positive/negative and pressure eval cases. | Luna authors | schema, alignment, trigger and live scenario checks |
| REQ-CYBER-004: truthful boundaries | AC-CYBER-004: active operations require documented authorization and demonstrated runtime controls; absent support blocks execution, not safe offline analysis; production modifications are gated for every team; no claim that Markdown enforces permissions. | Luna authors/Main | missing/expired scope and unsupported-runtime scenarios |
| REQ-CYBER-005: governed evolution | AC-CYBER-005: learning separates proposals, authorized edits, independent review and promotion; redaction and provenance precede persistence; root causes distinguish routing, procedure, tooling, evaluator and environment faults; no self-approved promotion. | Main | retrospective/evolution pressure scenarios |
| REQ-CYBER-006: portable distribution | AC-CYBER-006: cybersecurity is discoverable and opt-in; generated indexes and release tag routing include it; non-trigger metadata is retained where supported; unsupported restrictions are documented, never silently advertised as enforced. | Main/transport | CLI router/export checks, release tag validation, sync smoke |
| REQ-CYBER-007: evidence-led workflows | AC-CYBER-007: canonical blue/white/purple workflows compose skills; pentest preserves suspected/blocked/not-tested evidence without labeling it confirmed; existing security evidence conventions remain canonical. | Luna authors/Main | workflow validation and scenario review |
| REQ-CYBER-008: single reviewed delivery | AC-CYBER-008: one feature branch/PR contains scoped changelog, architecture/contributor guidance, verification evidence and explicit operational limitations; no publish/tag/deploy action. | Main | final diff/review and GitHub PR |

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
