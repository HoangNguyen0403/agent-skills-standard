# ScenarioContract v1 Specification

Canonical contract interface for bounded cybersecurity lab validation scenarios. Conforms to SRS-CLV-03 and LLD-SCENARIO.

## Schema Fields

| Field | Type / Format | Validation Rule |
| --- | --- | --- |
| `schema_version` | Integer (`1`) | Must be exactly 1; unsupported major versions fail preflight without heuristic migration. |
| `scenario_id` | String (`CLV-F01..07-{S,N,B,P}`) | Stable identifier matching scenario catalog. |
| `scenario_version` | String / Integer | Immutable revision; changes when fixture, hypothesis, limits, or rubrics change. |
| `family` | Enum (1 of 7 approved PRD families) | `web-api-input-request-boundaries` (F01), `auth-session-access-control` (F02), `filesystem-config-secret-exposure` (F03), `dependencies-vulnerable-components` (F04), `container-cloud-configuration` (F05), `endpoint-network-detection` (F06), `investigation-containment-recovery` (F07). |
| `objective` | String | Single observable claim; no autonomous multi-stage attack expansion. |
| `hypothesis` | String | Testable causal relationship between bounded action and expected observation. |
| `mode` | Enum | Exactly one of: `analysis`, `replay`, `isolated-lab-validation`, `defensive-verification`. |
| `target` | Object | `{lab_id, asset_id, fixture_revision, identity_proof_ref}`. Active target must be disposable and synthetic. Target omitted only for non-active `analysis`/`replay`. |
| `approved_actions` | Array of Objects | Exact action IDs/versions, permitted input/effect bounds. Deny by default for any action not listed. |
| `exclusions` | Array of Strings | Explicitly forbidden effects (production/public targets, ambient credentials, live malware, data exfiltration). |
| `authorization` | Object | `{engagement_scope_ref, authorization_ref, requester, approver, accountable_owner, valid_from, expires_at, restart_authority, review_status}`. Active fields must be current. |
| `synthetic_data_boundary` | Object | Permitted synthetic identities, markers, and test tokens; ambient or real credentials strictly prohibited. |
| `required_host_capabilities` | Array of Objects | Capability IDs with enforcement boundaries, proof criteria, freshness, and resource binding (see execution-gate.md). |
| `minimum_proof` | Object | Required action receipt fields, claim-specific observation predicates, original source, and permitted inferences. |
| `expected_observation` | Object | `{entity, channel, stages, window, predicate, source_owner}`. Fixed observation window established before run. |
| `execution_limits` | Object | Approved finite duration, action count/concurrency, resource/data/effect bounds, and network/filesystem limits with units and host enforcement proof. No default numeric limit is invented. |
| `stop_restart` | Object | Stop triggers, host stop mechanism/operator contact, cancellation proof, maximum demonstrated stop latency, restart approver, and fresh-gate rules. |
| `cleanup` | Object | Owned resources, teardown action IDs, surviving authority ref, expected residual-state predicates, observer, and verification source. |
| `remediation_retest` | Object | Bounded remediation proposal, fixed comparison claim, retest input revisions, and fresh-authority rule. |
| `evidence_owner` | String | Assigned accountable evidence role or named person. |
| `fidelity_limitations` | Array of Strings | Explicit boundaries: source reasoning vs. event replay vs. exercised lab behavior; local vs. cloud fidelity; benign emulation limitations. |

## Seven Approved Scenario Families (F01–F07)

Restored to exact PRD section 6 taxonomy and SRS:69/84 mapping:

1. **`web-api-input-request-boundaries` (F01)**:
   - *Defensive purpose*: Validate input handling, request boundaries, and server-side request restrictions.
   - *Realism boundary*: Local synthetic services only; no external target probing.
2. **`auth-session-access-control` (F02)**:
   - *Defensive purpose*: Verify actor and resource authorization, token validation, and session boundaries.
   - *Realism boundary*: Synthetic lab identities; no real account credentials.
3. **`filesystem-config-secret-exposure` (F03)**:
   - *Defensive purpose*: Verify permissions, configuration boundaries, and secret exposure handling.
   - *Realism boundary*: Disposable files and planted nonsecret synthetic markers; no access to personal/ambient paths.
4. **`dependencies-vulnerable-components` (F04)**:
   - *Defensive purpose*: Reproduce a bounded vulnerable-versus-patched claim across pinned component revisions.
   - *Realism boundary*: Pinned local fixtures with separate vulnerable/patched digests; documented prerequisites.
5. **`container-cloud-configuration` (F05)**:
   - *Defensive purpose*: Validate container configuration, local privilege boundaries, and isolation assumptions.
   - *Realism boundary*: Local disposable configurations; no tenant credentials; unsupported cloud provider fidelity made explicit.
6. **`endpoint-network-detection` (F06)**:
   - *Defensive purpose*: Exercise selected observable behavior against detection sensors and correlation pipelines.
   - *Realism boundary*: Benign bounded emulation or labeled replay; no claim of full attack-chain equivalence.
7. **`investigation-containment-recovery` (F07)**:
   - *Defensive purpose*: Validate analyst investigation, stop handling, containment decisions, and residual cleanup.
   - *Realism boundary*: Synthetic incidents, disposable lab state, and verified surviving teardown authority.

## Validation Invariants

- **Major Version Guard**: Only `schema_version: 1` is supported. Major version differences reject without heuristic migration.
- **No Blanket Permission**: A valid scenario definition documents intent; host execution requires an action-specific [GateDecision](execution-gate.md).
- **Disposable Fixtures**: Active actions require pinned synthetic fixtures. Ambient host or tenant credentials are forbidden.
- **Scenario Catalog**: Detailed case fixtures and family instances are defined in [scenario-catalog.md](scenario-catalog.md) (evaluation-owned).
