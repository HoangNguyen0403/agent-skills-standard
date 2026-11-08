# Brief: Provider-Neutral Security Teaching Depth

slug: provider-neutral-security-depth
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
approval: approved(requesting operator, 2026-11-07)
repository_status: approved_brief_saved
activation_status: not_required

SNC: S=2 N=1 C=2 total=5 tier=high. Conservative sizing for prospective security guidance across shared owners and provider trust boundaries; this intake changes only this brief. No implementation, premium consultation, publication, or runtime activation is authorized.

## Contract

**Outcome:** Learn selectively from Claude-Red to improve useful, evidence-grounded security assistance in agent-skills-standard. First delivery slice: one demand-loaded offline access-control review recipe using synthetic supplied artifacts, existing evidence/reporting contracts, and current provider exports.

**You said:** Investigate https://github.com/SnailSploit/claude-red, learn the good patterns for agent-skills-standard, and make the result work without Claude/ChatGPT restrictions getting in the way.

**Confirmed interpretation:** The desired outcome is legitimate defensive usability and provider portability, not overriding provider safeguards. Clear authorization and bounded tasks may reduce ambiguity; they do not guarantee acceptance. Maintainers own validation and approval. The requesting operator accepted this interpretation with `ok` on 2026-11-07.

**Constraints:** Preserve ADR-012, ADR-018 and ADR-019; canonical registry ownership; token economy; existing evidence statuses; and host/model safety rules. Separate content installation/discovery, model task acceptance, answer correctness, and runtime execution authority. Use compact core instructions and demand-loaded references. Any copied expression requires source/provenance review and applicable license notices. Verify factual/CVE assertions against primary advisories.

**Non-goals:** Importing all upstream skills; jailbreaks, euphemistic relabeling or hidden intent; refusing-provider retries/switching to evade a block; new provider adapters without demonstrated need; autonomous attacks; scanning public targets; credential collection; evasion, persistence, malware or exfiltration; changing dormant lab activation gates; paid/live model evaluations during intake; claims of guaranteed acceptance or measured efficacy.

### Proposed Acceptance Criteria

These are delivery requirements, not completed implementation claims.

- **AC-001 / REQ-001 — Selective learning:** Classify reviewed upstream patterns as adopt, already covered, qualify or reject. Record pinned source, current owner, factual counterevidence and attribution. Do not treat README/social claims as measured outcomes.
- **AC-002 / REQ-002 — Worked access-control reasoning:** Supply a bounded synthetic code/artifact example with an authoritative principal-role-tenant-resource-action matrix. Include permitted same-tenant access, denied cross-tenant access, denied privilege escalation, and an authorized cross-tenant exception only if the fixture explicitly defines one. Identify the actual server-side authorization defect, rather than treating predictable IDs, HTTP 200 or an unusual response as proof. Include a negative control and insufficient-evidence case.
- **AC-003 / REQ-002 — Remediation and retest:** Link the finding to supplied evidence, root cause, concrete server-side authorization remediation and expected post-fix behavior. Use existing finding statuses/report format. Distinguish supplied corroboration from an unexecuted retest; a blocked active step must neither erase valid supplied evidence nor become fabricated execution proof.
- **AC-004 / REQ-003 — Honest provider boundary:** Provide a truthful task envelope naming owner authorization, supplied artifacts, allowed analysis, excluded actions and desired output. Missing execution prerequisites must preserve safe analysis/remediation while blocking active effects. A provider refusal is recorded without prompt laundering or refusal-driven provider switching. Installation/discovery is not acceptance, and acceptance is not correctness or runtime authority.
- **AC-005 / REQ-004 — Verification separation:** Planning defines an independent expert oracle for the synthetic permissions matrix and pre/post-fix behavior. Existing lexical evals are answer smoke only. Verify changed canonical resources and, only if publication is in scope, resource/ID parity plus real consumer discovery. Live Claude/Codex acceptance remains NOT RUN until separately authorized, provider/version-pinned observations exist. No reduced-refusal claim without a matched baseline and correct, policy-compliant outputs.

## Why

- **Objective ID**: BRD-OBJ-001
- **Objective Statement**: Make authorized access-control reviews more concrete and verifiable without duplicating governance or weakening safety boundaries.

**Users:** Agents reviewing supplied application code; security maintainers; adopters using different supported agent hosts.

**AS-IS:** Current owners already cover authorization, scoped evidence review, reporting, remediation, a synthetic scenario catalog and provider exports. Whether an additional worked recipe improves agent decisions is unvalidated. No current-host lab activation or cross-provider security acceptance was demonstrated by this intake.

**TO-BE:** A consumer can reason from a permissions matrix to a defensible finding, patch and retest expectation while accurately reporting what was and was not exercised.

**SMART metric — proposed:** Within 14 calendar days after implementation approval, maintainers accept evidence for all five ACs, including expert-reviewed positive, negative and insufficient-evidence cases. Capture baseline outputs before changes. Refusal reduction, task-success improvement and latency/cost savings have no measured baseline and are not promised.

**Sponsor:** Requesting operator. **Validation owner:** Security/registry maintainers. **Handoff owner:** Repository maintainer acting as BA lead; next accountable role is the maintainer acting as product planner. Scope and drafted role defaults accepted by the requesting operator on 2026-11-07; no delivery date is committed.

## Capability Inventory And Slices

| Capability | Existing home | Disposition |
| --- | --- | --- |
| Compare authorized access | F02 catalog and scoped validation | First slice: one offline worked recipe; recheck for equivalent existing content before editing |
| Explain findings and fixes | cyber-evidence; common-security-audit remediation | Reuse schema; demonstrate it, do not create another format |
| Gate active effects | cyber-authorization; cyber-lab-validation | Already covered; no activation change |
| Deliver across hosts | Canonical registry/workflows and capability exports | Already covered; preserve exports, do not infer runtime parity |
| Teach other vulnerability families | Existing security owners | Separate follow-on candidates, not included implementation scope |
| Measure provider acceptance | Existing evaluation and publication boundaries | Separate empirical slice requiring approved providers, data, budget and observation protocol |

This brainstorm shapes only the first coherent teaching slice. Broader upstream coverage and live cross-provider evaluation remain visible candidates, not implicitly authorized work.

## Options And Recommendation

1. **Extend existing owners with one worked offline recipe — recommended.** Load-bearing assumption: concrete matrix-based reasoning adds value beyond present general contracts. First failure: equivalent guidance already exists or expert review finds no incremental teaching benefit. Worst case: extra context and conflicting advice. Abandonment cost: discard bounded reference changes before publication; no runtime migration. Stop or reuse existing material when the assumption fails.
2. **Defer source changes; retain the source comparison only.** Assumption: current standards already meet consumer needs. First failure: a supplied consumer case demonstrates a repeatable reasoning gap. Worst case: useful teaching remains absent. Abandonment cost: low; add a recipe once justified. Valid fallback, not a fabricated inferior alternative.

Reject wholesale import: broader offensive scope, Claude-specific assumptions and sampled source-quality defects conflict with the narrow contract. Do not build a new provider-neutral framework: one already exists here.

## Evidence

Upstream pin: `a8de813edc9f66f60d44cfe42d47750e89d9930b`. Local checkout HEAD observed by scout: `d1957d0a121ba386a704eb12130288e8ab675f3c`; not a clean-worktree claim. External repository text was inspected as data; no installers or security commands ran.

| Claim / lesson | Status | Disposition |
| --- | --- | --- |
| README advertises 78 skills, 23 categories, on-demand specialist behavior | confirmed([README](https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/README.md)) | Marketing assertions, not independently measured counts or effectiveness |
| IDOR methodology uses multiple accounts per role and baseline comparisons | confirmed([IDOR](https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/Skills/web/offensive-idor/SKILL.md)) | Adopt comparison pattern for supplied synthetic artifacts; reject blanket operational authority |
| Reporting connects root cause, evidence, impact, remediation and retest | confirmed([reporting](https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/Skills/utility/offensive-reporting/SKILL.md)) | Demonstrate existing local contracts rather than import a second template |
| Sampled IDOR lacks YAML frontmatter; its committed manifest description is empty | confirmed([IDOR](https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/Skills/web/offensive-idor/SKILL.md), [manifest](https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/claude-skills.json)) | Qualify guaranteed discovery claims; inspect actual consumer behavior |
| SQLi file associates CVE-2024-34517 with Cypher injection; vendor advisory instead describes immutable privileges requiring legitimate admin access | confirmed([SQLi](https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/Skills/web/offensive-sqli/SKILL.md), [Neo4j advisory](https://neo4j.com/security/cve-2024-34517/)) | Reject unverified CVE/version mappings |
| Upstream repository is MIT licensed | confirmed([LICENSE](https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/LICENSE)) | Preserve required notices if copying; third-party excerpt provenance still requires review |
| Cyber governance, offline lane and dormant active-lab gates already exist and exclude refusal-driven switching | confirmed(../../ARCHITECTURE.md:396-410,459-470) | Preserve; do not imply an unbuilt cyber framework |
| Existing catalog includes F02 access control and separates lexical smoke from execution proof | confirmed(../../skills/cybersecurity/cyber-lab-validation/references/scenario-catalog.md:10-47) | Reuse family semantics; an offline teaching recipe does not activate lab execution |
| Evidence statuses and remediation have canonical owners | confirmed(../../skills/cybersecurity/cyber-evidence/SKILL.md; ../../skills/common/common-security-audit/references/REMEDIATION.md) | Reuse, do not duplicate |
| Multiple agent surfaces are exported; runtime support can remain not_verified | confirmed(../../docs/agent-capabilities.md:1-19; ../../ARCHITECTURE.md:453-457) | Packaging portability is not model acceptance |
| Provider safeguards can be overridden by skill installation | unknown | No supporting demonstration; explicitly outside contract |
| Clear bounded task framing reduces unnecessary refusals or improves correctness | assumed | Unvalidated hypothesis; no numerical efficacy claim |
| OpenAI policy explicitly prohibits circumventing safeguards | confirmed([2025-10-29 revision](https://openai.com/policies/usage-policies/revisions/2025-10-29/)) | Respect applicable policy; do not optimize for bypass |
| Current fetched provider policy pages are necessarily applicable on the intake date | unknown | OpenAI landing page showed future effective date 2026-11-20; Anthropic AUP showed 2026-11-12. Do not treat future text or programs as current authority; resolve applicable terms before any live trial |
| Social screenshot's expert/80%-coverage claims describe measured results here | unknown | No benchmark or denominator; do not adopt |

No dedicated brief or canonical product evidence ledger for this slug appeared in the bounded current-worktree discovery. Existing lab references cite prior PRD/SRS authority not found in that lookup. This is a historical-provenance gap, not proof that requirements are absent. Before planning, recover and reuse applicable approved CLV artifacts from authorized history/worktrees; never recreate or override their decisions merely because filenames are unavailable. No canonical product IDs were minted or duplicated.

## Deep Sections

### Stakeholders And Cost-Benefit

| Stakeholder | Responsibility | Authority |
| --- | --- | --- |
| Requesting operator | Confirm scope, safe interpretation and defaults | Brief approval only |
| Security maintainer | Validate access matrix, factual accuracy and compatibility with existing gates | Technical review; no provider-policy waiver |
| Registry maintainer | Own canonical resources and any later publication proof | Publication approval separately scoped |
| Consumer owner | Authorize project artifacts and any later environment/data use | Runtime scope only through explicit matching approval |

Expected benefit: more actionable and honest defensive guidance. This remains a value hypothesis. Costs: expert review, reference maintenance, context weight and any separately approved experiments. Host usage/prices are unavailable; no monetary savings estimate is justified.

### Risks

| Risk | Mitigation | Owner |
| --- | --- | --- |
| User expects restriction bypass | State safe interpretation and require brief confirmation; no bypass deliverable | Requesting operator / planner |
| Duplicate existing CLV decisions or recipe | Recover historical authority and inspect current owner before source changes | Planner |
| Imported inaccuracies or license problems | Primary advisory checks, original worked fixture, attribution/provenance review | Security maintainer |
| Recipe implies active authorization | Keep supplied-artifact lane explicit; preserve dormant runtime gates | Security maintainer |
| False efficacy claim from keyword evals | Independent oracle; separate smoke, discovery, acceptance and runtime evidence | Validation owner |
| Provider/date drift | Pin provider/model/surface and applicable terms for any approved live trial | Trial owner, only if commissioned |

### Glossary

- **Provider-neutral:** portable content and explicit host capability boundaries, not identical provider policies or behavior.
- **Offline review:** analyze supplied code/config/log artifacts without interacting with a target system.
- **BOLA/IDOR:** missing object-level authorization; identifier predictability alone does not establish it.
- **Acceptance:** a model processes an allowed task; it does not establish answer correctness or execution authority.

### PM Handoff Checklist

- [x] Operator intent and proposed safety interpretation recorded separately.
- [x] First slice, exclusions, owners, ACs, counterevidence and honest defer option recorded.
- [x] Source pins and current-owner evidence supplied; no runtime or efficacy proof claimed.
- [x] Operator confirmed brief and drafted defaults with `ok` on 2026-11-07.
- [ ] Planner recovers applicable historical CLV authority and checks for an equivalent worked recipe.
- [ ] Planner assigns exact canonical files, expert oracle, focused checks and any publication boundary.
- [ ] If live comparisons are requested later: obtain explicit provider/account/data/budget authority and independent security review first.

## Approval

Approved by the requesting operator with `ok` on 2026-11-07. Approval covers this brief only and grants no implementation execution approach, paid calls, target exposure, lab activation, merge or rollout authority. High-tier implementation requires the subsequent approved plan and relevant independent architecture/security review.

## Outcome Report

```json
{
  "schema_version": 1,
  "run_id": "brainstorm-provider-neutral-security-depth-20261107",
  "slug": "provider-neutral-security-depth",
  "workflow": "brainstorm-feature",
  "operator_profile": "technical",
  "lane": "direction",
  "snc_tier": "high",
  "model_tier": "strong",
  "approval": "approved(requesting operator, 2026-11-07)",
  "feature_status": "requirements_ready",
  "started_at": "2026-11-07T06:13:41Z",
  "completed_at": "2026-11-07T06:17:02Z",
  "requirement_trace": {
    "brd_objectives": ["BRD-OBJ-001"],
    "requirements": ["REQ-001", "REQ-002", "REQ-003", "REQ-004"],
    "acceptance_criteria": ["AC-001", "AC-002", "AC-003", "AC-004", "AC-005"],
    "srs": []
  },
  "completed_evidence": ["pinned representative upstream inspection", "bounded current-owner comparison", "primary CVE counterevidence", "MCP consultation audit", "operator brief approval: ok, 2026-11-07"],
  "missing_evidence": ["historical CLV artifact recovery for planning", "incremental recipe value validation", "authorized live provider acceptance observations"],
  "decision_needed": [],
  "recommended_next_workflow": "plan-feature",
  "cost": {"source": "unavailable", "status": "partial"},
  "agent": {"identity": "orchestrator", "model": "openai-codex/gpt-6.1-sol"}
}
```

`requirements_ready` describes an approved direction brief ready for planning, not approved implementation readiness. Trace IDs are proposed local seeds; planning normalizes/reuses canonical requirements rather than duplicating them.

## Open Questions

Scope, safety interpretation and drafted role defaults are settled by operator approval. Exact authoring owner and verification commands belong to planning. Live acceptance, budget and host activation remain unknown and outside the first slice; they do not block offline analysis or this brief.

## Next Workflow

`plan-feature` is the next workflow; brief approval is recorded. Keep the adoption-benefit hypothesis explicitly unvalidated. If empirical cross-provider validation becomes a selected requirement, use the installed `validate-product` workflow to define a bounded experiment before any separately authorized live trial.

## Cost Report

Called `get_session_cost(workflow="brainstorm-feature", slug="provider-neutral-security-depth")`. MCP reported partial telemetry: host input/cached/output/reasoning tokens, prices and complete runtime cost unavailable. Shared MCP consultation counts and a partial worker cost are not total-task cost. No numerical savings or total price is claimed.

## Intake Verification

Two bounded read-only source investigations completed. Orchestrator independently inspected existing ADR boundaries, F02 catalog, provider matrix, upstream IDOR opening/methodology and the Neo4j advisory. Compliance audit recorded five loaded standards and the brainstorm workflow, with no routed coverage gap; this proves consultation only. No installer, payload, security tool, model benchmark, code test, build or runtime activation was executed. This is an evidence-backed direction brief, not implementation or behavioral certification.
