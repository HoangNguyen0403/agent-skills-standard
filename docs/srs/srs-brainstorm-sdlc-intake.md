# Technical Requirements (SRS/FRS): Standalone Brainstorming and SDLC Intake

Status: requirements and technical contract for repository implementation
slug: brainstorm-sdlc-intake
lane: direction
delivery_mode: standard
repository_status: implemented; behavioral qualification and human acceptance tracked separately
activation_status: not_requested

## Trace Source

Source request: the maintainer reported that the local brainstorming workflow behaved as an intake interview. Approved plan: [PRD](../prd/prd-brainstorm-sdlc-intake.md) (`docs/prd/prd-brainstorm-sdlc-intake.md`).

Source IDs: REQ-001..006; AC-001..013. The PRD remains the authority for acceptance criteria; this document specifies the implementing interface contracts and does not redefine any criterion.

Behavioral evidence for AC-001..009 comes from separate authorized conversation transcripts. No transcript or verdict is asserted here.

## Architecture And Contract Delta

Audience: workflow author, CLI/MCP consumer, generator owner, independent reviewer. There is no service, database, network protocol or permission change.

| HLD | Requirements traced | Component / owner | Contract / dependency direction |
| --- | --- | --- | --- |
| HLD-001 | REQ-001/002/003 | `.agents/workflows/brainstorm.md`; `skills/common/common-decision-discipline/references/explore-facilitation.md` | standalone workflow body → neutral facilitation reference; no lifecycle contract import |
| HLD-002 | REQ-004 | `.agents/workflows/sdlc-intake.md`; `.agents/workflows/sdlc.md`; `monitor-respond.md` | renamed intake body keeps prior obligations; routing tables reference the new identity |
| HLD-003 | REQ-005 | `cli/src/constants/index.ts`; `scripts/workflow-chain.ts`; `scripts/audit-sdlc.ts`; `scripts/outcome/schema.ts`; `scripts/generation/isolated-stage.ts`; `.skillsrc` | registries and generator declare one active identity per responsibility |
| HLD-004 | REQ-005 | generator ownership ledger; `cli/src/services/__tests__/WorkflowCatalogInstall.spec.ts` | update path retires owned stale exports, preserves edited files |
| HLD-005 | REQ-006 | `scripts/audit-sdlc.product-evidence.test.ts`; `mcp/test/WorkflowIndex.spec.ts`; isolated migration fixtures | structural and consumer results reported separately from behavior |

Generated native mirrors (`.claude/`, `.codex/`, `.github/`, `.agents/skills/`) are produced only through the ownership-aware isolated generator; no hand-edited mirror is an authority.

## Requirement Contracts

### SRS-001: Generative exploration before evaluation

- **Source:** REQ-001 / AC-001
- Exploration answers an idea request with concrete, meaningfully distinct possibilities before requesting owner, metric, scope or approval commitment.
- Feasibility remains evidence-qualified: presenting a possibility is not a feasibility claim.
- Contract surface: `brainstorm` workflow steps and `explore-facilitation.md`; no required option count and no mandatory card.

### SRS-002: Single open question under genuine ambiguity

- **Source:** REQ-001 / AC-002
- When intent is genuinely ambiguous, ask one relevant open question; do not restart intake or invent motivations.
- Subsequent turns build on the operator's reply and preserve stated constraints.

### SRS-003: Terminal exploration without delivery artifacts

- **Source:** REQ-002 / AC-003
- A no-build or out-of-repository request produces exploration only: no BRD, no required file creation, no feature-status mutation, no planning handoff, no slug minting.
- Default output is chat; a repository note is optional and explicitly requested, recommended under `docs/brainstorms/<topic>.md`.

### SRS-004: Park or multiple possibilities as a valid endpoint

- **Source:** REQ-002 / AC-004
- Parking, keeping several directions, or stopping terminates the workflow without a required winner, recommendation, approval or successor.
- No lifecycle state, run record or owner is required to end exploration.

### SRS-005: Context-only promotion into intake

- **Source:** REQ-003 / AC-005
- An explicit delivery-brief request routes to `sdlc-intake` with only the context available: framing, stated intent/constraints, explored directions, selected direction, assumptions, evidence references with uncertainty, unresolved questions.
- Intake reuses that context instead of re-interviewing settled facts.

### SRS-006: Endorsement is not promotion or authority

- **Source:** REQ-003 / AC-006
- A bare endorsement of an idea, and an inherited autonomous-continuation preference, do not promote the exploration into delivery and do not grant implementation authority.
- Approval provenance remains intake-owned; no ID, hash or readiness status may be fabricated.

### SRS-007: Direct delivery intent bypasses standalone brainstorming

- **Source:** REQ-004 / AC-007
- A routine delivery request, or already-approved requirements, routes to intake or an appropriate downstream stage; standalone brainstorming is never a prerequisite.
- `/sdlc` may explain or route an explicitly exploratory request to the terminal branch without creating delivery state.

### SRS-008: Pending and high-tier holds preserved

- **Source:** REQ-004 / AC-008
- Sensitive/high-tier intake keeps existing SNC risk floors and pending approval holds; no readiness, action or activation is emitted without the existing authorization.
- Intake approval never grants implementation, spend, release or activation authority.

### SRS-009: Proportional quick intake retained

- **Source:** REQ-004 / AC-009
- Quick chat-only intake with sufficient context stays chat-only; Standard/Deep intake keeps `docs/brd/brd-[slug].md`.
- No mandatory document set is added by the rename.

### SRS-010: Distinct discoverable workflow identities

- **Source:** REQ-005 / AC-010
- `brainstorm` and `sdlc-intake` are registered as distinct default-discoverable workflows with distinct descriptions and canonical bodies.
- `brainstorm` stays outside the core SDLC chain and the runtime-contract list; the retired `brainstorm-feature` identity is not an active command.

### SRS-011: Ownership-safe update retirement

- **Source:** REQ-005 / AC-011
- Update from the prior generated workflow set retires only generator-owned stale exports through the existing ownership checks.
- User-edited obsolete exports produce a visible conflict/keep result, never silent deletion.

### SRS-012: Historical evidence remains byte-stable

- **Source:** REQ-005 / AC-012
- Existing BRDs, slugs, approval hashes, run records and sealed evaluation evidence are not rewritten.
- Historical record validation accepts the retired identifier as own-key data only; it is not an executable alias and grants no approval.

### SRS-013: Structural and behavioral results reported separately

- **Source:** REQ-006 / AC-013
- Registry/discovery audits, consumer-fixture tests and conversational evaluations are reported as distinct lanes.
- Keyword compliance or static parity alone cannot establish a successful brainstorm; unrun behavioral criteria are reported NOT RUN, not PASS.

## Verification Mapping

| Lane | Command / evidence | Criteria |
| --- | --- | --- |
| Structural | `pnpm audit:sdlc` | AC-010 |
| Registry/consumer | `pnpm --filter ./mcp exec vitest run test/WorkflowIndex.spec.ts`; `pnpm --filter ./cli exec vitest run src/services/__tests__/WorkflowCatalogInstall.spec.ts` | AC-010, AC-011 |
| Generation | `node --import tsx scripts/generation/index.ts --check`; `scripts/generation/isolated-stage.test.ts` | AC-011, AC-012 |
| Behavior | authorized conversation transcripts under the approved evaluation route | AC-001..009, AC-013 |

This mapping records the intended lanes only; it does not assert that a lane has passed.
