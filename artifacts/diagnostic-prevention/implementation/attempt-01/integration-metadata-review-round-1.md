# Integration metadata/document review — round 1

## Verdicts

- **Spec: CHANGES REQUESTED — one bounded generator-status qualification.** Candidate version selections, source routing and the corrected trust/verification scope are otherwise consistent with the approved plan.
- **Quality: CHANGES REQUESTED — F1 below.** No dependency/pin, package-version, recursion or additional security-contract defect established in this seven-file packet.
- **Generator readiness/publication: NOT ACCEPTED.** Task1 remains unresolved. This review does not authorize root generation, ownership adoption, release, publication, activation or a pilot.

## F1 — [MAJOR] Operational generation instructions lack a local candidate/Task1-pending qualification

**Location:** `CONTRIBUTING.md:200-223`, especially apply command `208-209` and `safe coordinator` at214; `ARCHITECTURE.md:371` describes the same protection as present behavior. Related candidate release description: `CHANGELOG.md:15-16,33`.

**Why:** The changelog correctly labels this a Candidate and says final integrated verification is pending, but the contributor-facing operational section unconditionally advertises a safe coordinator and gives apply/adoption commands. Task1 is still under safety review: the parent reports 35 coordinator tests with1 PASS/34 setup failures from undefined `fixture.plan`, a test correction now frozen but not rerun, and a production `lockBaselineDigest` undefined-reference finding. The root actual-generation run is NOT RUN. Those observations are ground truth for this review; they were not rerun/reconfirmed. Without a local qualification, a reader following CONTRIBUTING can mistake a proposed contract for a verified safe replacement and apply/adopt before the generator gate closes. The ADR's normative decision is reasonable, but its present-tense implementation description should not supply the missing readiness evidence.

**Fix:** Add a concise status note beside the generation instructions and qualify/link the ADR generation item: candidate implementation, Task1 safety review/corrective verification pending, root generation/adoption/publication not yet accepted. Keep the existing pristine tracked-BASE plus real prior-producer proof requirement; state it as a prerequisite, not a routine override. Do not rewrite the generator or accepted plan in this documentation correction. Parent separately closes Task1 through the approved implementation/review route and retains failed receipts.

**Closure condition:** Reader can distinguish the intended generator safety contract from current acceptance status without consulting this private review packet or extrapolating from unrelated CLI/MCP/eval green suites. No new test requested by this finding.

## Scope and provenance

Authorized seven-file candidate packet: `integration-metadata-review-round-1.diff` (tool snapshot `1D2B`; parent-reported27378 bytes), cumulative from base `52ac482a5b948d9d26df4c3a2617afec74d1cf54`:

1. `package.json`
2. `cli/package.json`
3. `mcp/package.json`
4. `skills/metadata.json`
5. `CHANGELOG.md`
6. `ARCHITECTURE.md`
7. `CONTRIBUTING.md`

Read the entire packet plus corresponding current changed ranges. Read approved plan Global Constraints/shared contracts/Task1 and Task8 obligations; external-gates record and completed Task6 provenance review as needed. Inspected only the direct source command chain in the generation coordinator to establish non-recursion, not to re-review its safety implementation. Task4/5 finite contracts and their prior approvals were not reopened. No Task2/7 implementation verdict supplied.

Trust class: semi-trusted local candidate package/reports. Parent execution claims are attributed evidence, not this reviewer's observations. Tool snapshot IDs identify the reads, not cryptographic source commitments. No hashes computed or runtime behavior claimed.

Rules loaded for this request: MCP `common/common-architecture-audit`, `common/common-architecture-diagramming`, `common/common-best-practices`, `common/common-security-audit`, `common/common-security-standards`, `system-design/system-design-principles`, plus direct `common/common-code-review`; managed `ags-evidence-status-wording` and `ags-generator-safety`. MCP session audit was invoked; generic product-management category warning does not establish a missing applicable product-management rule for this bounded package/doc review. No diagrams, scans or broad architecture assessment were requested/performed.

## Candidate version and compatibility assessment

| Surface | Actual candidate | Consistency |
|---|---|---|
| Root package | `agent-skills-standard-root`2.6.7, private | Matches CLI candidate version; not a published release claim. |
| CLI package | `agent-skills-standard`2.6.7 | Patch increment from2.6.6 in the packet. |
| MCP package | `agent-skills-standard-mcp`0.7.1 | Patch increment from0.7.0 in the packet. |
| Common category |2.9.1, `last_updated: 2026-10-28`, prefix `common-v` | Matches changelog candidate and common-package change scope. |
| Workflow release |1.1.7, prefix `workflows-v` | Matches changed canonical workflow scope and new changelog heading. |

`CHANGELOG.md:10,26-31` agrees with all five actual selectors. The existing older singular `workflow-v` changelog heading is outside this correction; the new plural prefix matches metadata. The candidate date reflects the planned change date; it is not a test timestamp or release/publication date claim.

The scoped diff changes versions/routing/metadata fields only, not dependency versions, peer ranges, bin entries or runtime engines. No missing release or pin update is inferred merely because the candidate version changed. No network/package-registry compatibility or availability check was performed. No new release/tag/pin is required by this review.

Root and MCP retain their `node >=20.0.0` declarations; CLI has no `engines` entry in its manifest. Unchanged support declarations are not Node20 execution evidence. Parent runs are scoped to Node26, not all declared versions; no Node20-runtime efficacy claim was found in the changed text. Dependency symlinks remain the plan's same-base reuse, not lock-exact provenance. Token metrics/generation derivatives remain a pending integration surface; this review does not certify them regenerated.

## Public command routing: source-consistent and nonrecursive

- Root `package.json` routes `generate-indices` directly to `tsx scripts/generation/index.ts`.
- `scripts/generation/index.ts:27-31` calls `runIsolatedGeneration` directly; it does not invoke the package command again.
- `scripts/generation/isolated-stage.ts:2281-2294` launches `node --import tsx <stageRoot>/scripts/generate-indices.ts` as the internal child, alongside the token/capability children. The prior-producer proof path likewise runs direct script filenames at `1545-1553`.

Therefore the reviewed public→coordinator→internal-child routing is **nonrecursive by source inspection**. This validates the documentation's recursion explanation (`CONTRIBUTING.md:214-216`), not the coordinator's runtime correctness or safety. The known production undefined-reference issue remains Task1's blocker. No generation/check/adoption command was launched.

The adoption wording already rejects a routine override, requires matching tracked base and prior producer output, archives proof, and excludes adoption from `--check`. Keep the user's narrower authorization: **SCOPED adoption only, pristine BASE plus real old-producer proof**. The presence of an apply flag or a command example is not adoption authority or successful proof. F1 asks for status qualification, not a weaker adoption path.

## Document contract assessment

### Trust, browser and evidence scope

- `CONTRIBUTING.md:59` scopes operation-private capabilities to privileged mint/seal/restore/high-risk operations and explicitly preserves ordinary session lifetimes. It requires authentic caller provenance without universal signature mandates. This does not reinstate Task4's prior overgeneralization.
- Same rule withholds backend-governance/CSRF credit from renderer-only/manual-header/fetch evidence; it does not outlaw those tools for their valid narrower test purposes.
- `CHANGELOG.md:20` is a concise change summary, not a replacement browser contract. Interpret native Origin requirements under the approved state-changing-form policy, not as a blanket Origin header requirement for all GET navigation. A phrase such as `state-changing native-form Origin/CSRF policy` would be clearer but is nonblocking under the scoped rule/reference context.
- `CONTRIBUTING.md:234` explicitly limits finite oracles to bounded assertion contracts. No whole-answer semantic safety, measured model uplift or production efficacy is claimed. Prior Task4/5 approval remains bounded.

### Layered verification

`CONTRIBUTING.md:227-234` separates source delivery at recorded SHA/dirty identity from independently recorded build/lint/typecheck statuses. It does not convert source-ready into unobserved PASS; human acceptance is required when mandated by the release scope, not every unit iteration. Focused membership/count, actual changed consumer ingress and independent review remain separate. `ARCHITECTURE.md:372` states the layered contract rather than asserting completion. Historical RED remains NOT RUN if not observed; no simulated/faked RED permission is introduced.

### Telemetry and host provenance

`ARCHITECTURE.md:48-56` separates discovery, direct bodies and deduped stubs; explicitly denies that audit/cost output certifies checks/enforcement or outgoing worker delivery. Conditional pricing distinguishes missing positive-usage rates from known zero buckets. `CONTRIBUTING.md:60` and `CHANGELOG.md:21` preserve missing versus zero/partial accounting; none asserts billed full-task cost or savings.

No changed doc upgrades a caller-provided `host` source label into authenticated host identity. Task6's completed review explicitly leaves it caller-declared/unverified (`task-6-review-round-2.md:31-39`), and this packet does not contradict that boundary. Exact rates, lineage, current mounted source and actor consumption are not established by these summaries. `active tool usage` in the changelog/contributor lifecycle shorthand should not be read as consultation counts proving model adherence; the detailed architecture disclaimer preserves that distinction.

### External gates

`ARCHITECTURE.md:373`, `CONTRIBUTING.md:236`, `CHANGELOG.md:32` preserve user-blocked host-only resolver/dispatcher/process/collector work and prohibit autoapproval/denial bypass or live-host-enforcement claims. Read in context, H01–H05 refers to their host-only portions, not a claim that the reachable repository quota/MCP work was abandoned or that all H03 tooling lives externally. The exact split remains in `external-gates.md:5,15-31`.

No pilot, publication, activation, collector enrollment, paid model trial or cross-account authorization is implied. The `.agent` preservation summary is consistent with conservative retention, not permission to delete unknown state.

## Parent execution evidence — attributed and bounded

Supplied with this review request, not run or independently re-created here:

- Whole CLI:1271 PASS; build PASS.
- MCP:211 PASS; build PASS;10 SDK assertions.
- Evaluator:322 PASS/0 skipped; scoped actual quality/alignment0 issues.
- Helper:29 PASS; actual installed receipt02 PASS.
- Full built-product smoke02: PASS,7.78s,13 entries verified, collector=true.
- Coordinator suite:35 tests,1 PASS/34 setup failures from undefined `fixture.plan`; corrective tests now FINAL but **not rerun**.
- Task1 static review: production undefined `lockBaselineDigest` finding.
- Root actual generation: **NOT RUN, pending Task1**.

Finite fixtures and Node26 runs do not establish Node20 compatibility, live collector enrollment, authenticated host provenance, general model efficacy or generator safety. A `collector=true` fixture field is not a live host collector attestation. Successful unrelated suites do not supersede coordinator setup failures or the production finding. Original RED remains NOT RUN; prior failures remain historical evidence.

The changelog's global `pending final integrated verification` statement is honest. F1 concerns the missing local operational qualifier, not a demand to replace candidate contracts with a full run ledger or to prematurely mark tested slices NOT RUN.

## Required disposition

Make only the bounded candidate/Task1-pending note near generation instructions and corresponding ADR item. Retain the coherent candidate versions, direct nonrecursive routing, scoped adoption constraints, corrected trust/layer definitions and blocked host gates. Resolve Task1 outside this seven-file doc review through its existing route; do not regenerate, force-adopt, publish or widen authority as part of this correction.

## Review limits

Sole write: this new report. No source edits, commands/checks/tests/build/lint/formatters/generation/probes/scans/network/paid calls/delegation/premium. No deployed, published or human-accepted state asserted. No hidden narrowing of the approved plan; final metadata/generated parity remains the parent's integration obligation after Task1 settles. Exact reviewer token/currency cost unavailable; MCP consultation counts are not billed task totals or savings.
