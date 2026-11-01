# Evidence & Reporting Matrix

## Unified Operations Report Shape

Every operational invocation must produce exactly one standardized Operations Report containing these instruction-level fields:

- `run_id`: Unique run identifier (e.g. UUID or ISO compact timestamp).
- `operation`: One of `setup`, `deploy`, `verify`, `monitor`, `diagnose`, `recover`.
- `target`: Cloud provider, service, organization/account, project, region, and environment.
- `principal_ref`: Authenticated principal ARN, email, or service account identity.
- `capabilities`: Discovered MCP tools and capabilities used during execution.
- `authority_refs`: Human approval reference, change ticket ID, and organization policy identifiers.
- `actions`: Proposed and executed actions with timestamps and effect classifications.
- `deployment_or_resource_ref`: Immutable artifact SHA-256 digest, container tag, or cloud resource ARN.
- `checks`: Concrete outward verification checks executed and observed results.
- `gaps`: Missing tools, unenforced security boundaries, or omitted checks.
- `outcome`: Standardized outcome vocabulary (`completed`, `failed`, `blocked`, `uncertain`, plus specific reason code).
- `feature_lifecycle`: Feature lifecycle status evaluated strictly according to the reporting matrix.
- `next_action`: Recommended immediate operational step, or `none`.

### Secret Protection Invariant

Reports, receipts, and artifacts must never contain raw secrets, API tokens, authorization headers, or customer passwords. All credentials must be redacted before recording.

## Lifecycle Reporting Matrix

Operation disposition is distinct from feature lifecycle. Apply these rules across operational contexts:

| Operational Context | Feature Lifecycle Action | Operations Record & Routing |
| --- | --- | --- |
| **Verified Authorized Release** | Advance feature lifecycle only per verified release evidence | Emit Operations Report + standard release run record (`feature_status: released`); publish notes if authorized. |
| **Non-Deploy Action with Prior Lifecycle Evidence** | Preserve previously evidenced lifecycle (e.g. `released`, `verified`); never advance or downgrade from operation outcome | Emit Operations Report recording operation disposition; reference prior lifecycle evidence without modifying it. |
| **Non-Deploy Action without Lifecycle Evidence** | Do not invent a lifecycle state; do not emit a feature run record | Operations Report only; set `feature_lifecycle: not_assessed` inside the report. |
| **Blocked / Failed Operation on Known Service** | Preserve prior evidenced lifecycle without alteration | Record failure in Operations Report; failure belongs to the operational execution, not the software feature state. |
| **Terminal or No-Handoff State** | No invented transition | Set `recommended_next_workflow: null` if a feature record is emitted; set `next_action: none` in Operations Report. |

## Mandatory Consumer Gap Handling

- If an external consumer tool, pipeline validator, or schema gate requires a standard `RunRecord` (from `scripts/outcome/schema.ts`) when the service has no prior lifecycle evidence:
  1. Do not fabricate a status enum (such as falsely claiming `released` or `verified`) to satisfy validation.
  2. Block the record-producing lane and report the exact schema/consumer gap.
  3. Request separate schema-change approval from the project maintainers.

## Operations Report Template

```markdown
# Operations Report

- **Run ID**: [run_id]
- **Operation**: [setup | deploy | verify | monitor | diagnose | recover]
- **Target**: [provider / account / project / environment]
- **Principal Ref**: [authenticated caller]
- **Capabilities Discovered**: [tool names]
- **Authority References**: [approval ticket / named approver / expiry]
- **Deployment / Resource Ref**: [immutable SHA / ARN]
- **Outcome**: [completed | failed | blocked | uncertain_write | reason code]
- **Feature Lifecycle**: [preserved: <state> | not_assessed | advanced: released]
- **Next Action**: [none | specific next operational step]

## Executed Actions

| Timestamp | Action Name | Effect Classification | Result |
| --- | --- | --- | --- |
| [ISO-8601] | [action] | [read_only | deploy_bearing | config_mutation] | [success | failure] |

## Outward Verification

| Check Target | Check Type | Observed Response | Pass / Fail |
| --- | --- | --- | --- |
| [origin endpoint] | [tls_handshake | root_200 | not_found_404] | [status / latency] | [PASS | FAIL] |

## Identified Gaps & Limitations

- **Tooling Gaps**: [missing_mcp | missing_capability | none]
- **Enforcement Gaps**: [unsupported_enforcement | none]
- **Unrun Verifications**: [reason why outward check was omitted, or none]
```
