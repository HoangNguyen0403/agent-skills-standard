# OWASP MCP Top 10 Mapping & Coverage Aggregation

Original assessment guidance mapped to the pinned OWASP MCP Top 10 taxonomy.

## Taxonomy Pin & Provenance

- **Primary source**: [OWASP MCP Top 10](https://owasp.org/projects/mcp-top-10) (`OWASP/www-project-mcp-top-10`)
- **Pinned revision**: `165fe0f78ef104459237b4a8e0f6e78db9b02391` (2025 beta/pilot documents; not a compliance or certification standard)
- **Observed licensing conflict (publication/reuse limitation)**: At the pinned commit, [`LICENSE.md`](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/LICENSE.md) (blob `9ef8bfabe2d0025e2d2e61a24fe3f3ac37333d71`) states `CC BY-SA 4.0`, whereas [`index.md`](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/index.md) (blob `1b50e5c0a51fb3cfef2fb9c1fe3137807e1f57da`) and [`README.md`](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/README.md) (blob `1b369f3270be0fc09f8d406537ec9a2195ca2e6a`) name/link `CC BY-NC-SA 4.0`. Do not assume permissive clearance or copy upstream prose, checklists, examples, or payloads; this skill uses original control questions, brief category IDs/titles, and pinned attribution only, preserving the upstream licensing conflict as a publication/reuse limitation. Secondary vendor summaries (e.g., Cycode) are not authoritative or independently adopted.
- **Pinned upstream link anomalies**: `MCP06` actual body is [`2025/MCP06-2025–Intent-Flow-Subversion.md`](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/2025/MCP06-2025%E2%80%93Intent-Flow-Subversion.md) (matching `index.md` title `Intent Flow Subversion`), while `README.md` uses `Prompt Injection via Contextual Payloads` and links a broken alternate filename; `MCP05`'s footer link incorrectly points to `MCP10`. Keep `MCP06` as one category (`Prompt Injection via Contextual Payloads` / `Intent Flow Subversion`) and cite actual pinned category bodies rather than footer links.
## Pinned Categories (MCP01–MCP10)

Emit exactly one category summary per `MCP01` through `MCP10` in the report's OWASP Coverage table. Preserve `MCP06`'s upstream filename/title alias (`Intent Flow Subversion`) without creating an 11th category.

| ID | Canonical Title & Alias | Primary Review Focus (Supplied Artifacts) | Boundary & Evidence Limits | Primary Reference |
| --- | --- | --- | --- | --- |
| `MCP01` | Token Mismanagement & Secret Exposure | Credential-reference names vs plaintext tokens in configs, templates, or supplied traces; token lifetime/rotation policy and log redaction controls. | Never reproduce secret values; uninspected runtime logs or memory remain unassessed. | [MCP01-2025](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/2025/MCP01-2025-Token-Mismanagement-and-Secret-Exposure.md) |
| `MCP02` | Privilege Escalation via Scope Creep | Declared tool capabilities and host privilege grants compared against separate supplied approval/purpose records; scope expiry and entitlement drift controls. | Configuration alone without a policy/approval record cannot establish a mismatch; runtime enforcement stays unassessed statically. | [MCP02-2025](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/2025/MCP02-2025%E2%80%93Privilege-Escalation-via-Scope-Creep.md) |
| `MCP03` | Tool Poisoning | Supplied tool names, descriptions, schemas, and manifest digests for model-directed imperatives, concealed comments/control characters, sensitive-path lures, or undeclared destructive mappings. | Static text inspection cannot prove absence of dynamic or server-side description drift after connection. | [MCP03-2025](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/2025/MCP03-2025%E2%80%93Tool-Poisoning.md) |
| `MCP04` | Software Supply Chain Attacks & Dependency Tampering | Exact package identity, version pinning (vs floating tags), lockfiles, checksums/signatures, provenance metadata, and third-party plugin isolation. | Absent source/lockfile prevents supply-chain verification; unreviewed packages are never installed or launched. | [MCP04-2025](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/2025/MCP04-2025%E2%80%93Software-Supply-Chain-Attacks%26Dependency-Tampering.md) |
| `MCP05` | Command Injection & Execution | Supplied server/tool source for shell interpolation, `exec`/`eval`, unvalidated path concatenation, SQL string building, and missing sandboxing/allowlists. | Config-only exports without server source cannot assess implementation sinks. | [MCP05-2025](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/2025/MCP05-2025%E2%80%93Command-Injection%26Execution.md) |
| `MCP06` | Prompt Injection via Contextual Payloads (alias: Intent Flow Subversion) | Trust boundaries separating user intent, retrieved MCP resources/tool outputs, and policy-checked tool calls; intent-alignment and untrusted-context tagging. | Host/agent orchestration behavior outside supplied config/source remains unassessed. | [MCP06-2025](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/2025/MCP06-2025%E2%80%93Intent-Flow-Subversion.md) |
| `MCP07` | Insufficient Authentication & Authorization | Transport-appropriate identity verification, token scoping/audience binding, per-request server-side authZ, and host/OS isolation. | Apply transport rules below; missing server-side evidence makes server authZ `unknown`. | [MCP07-2025](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/2025/MCP07-2025%E2%80%93Insufficient-Authentication%26Authorization.md) |
| `MCP08` | Lack of Audit and Telemetry | Structured invocation/identity/schema-hash logging, tamper-evident retention, redaction in audit trails, and supplied telemetry samples. | Declared logging config does not prove live log capture, integrity, or alerting. | [MCP08-2025](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/2025/MCP08-2025%E2%80%93Lack-of-Audit-and-Telemetry.md) |
| `MCP09` | Shadow MCP Servers | Declared integration inventory compared against supplied governance/registry approval records to detect unapproved or unowned entries. | Assesses supplied records only; cannot discover unconfigured machine/network shadow nodes. | [MCP09-2025](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/2025/MCP09-2025%E2%80%93Shadow-MCP-Servers.md) |
| `MCP10` | Context Injection & Over-Sharing | Context namespace isolation (user/tenant/agent/task), context TTL/purge rules, data classification, and memory-write authorization. | Runtime shared-memory or vector-store behavior without source/architecture docs stays `not-assessed`. | [MCP10-2025](https://github.com/OWASP/www-project-mcp-top-10/blob/165fe0f78ef104459237b4a8e0f6e78db9b02391/2025/MCP10-2025%E2%80%93ContextInjection%26OverSharing.md) |

## Transport-Aware Control Rules

1. **Local `stdio` integrations**:
   - Do **not** raise an authentication finding solely because OAuth or remote bearer-token configuration is absent.
   - Review supplied local OS/process privilege boundary, workspace path restrictions, environment variable inheritance, and package provenance.
   - Network-only remote endpoint controls (e.g., remote mTLS or remote OAuth audience checks) may be `not-applicable` for `MCP07` *only* when supplied evidence confirms pure local `stdio` transport with no network listener or remote proxy; host/OS process boundary controls remain applicable.
2. **Remote HTTP / SSE / Streamable HTTP integrations**:
   - Absence of client-side OAuth or auth headers in a client config export is an **evidence gap** (client config may rely on external/dynamic auth or server-side checks), **not** proof that the remote server permits anonymous access.
   - Do not mandate OAuth specifically when another verified, appropriately scoped auth mechanism (e.g., mTLS + scoped service identity) is evidenced.
   - Distinguish client credential configuration, server-side token validation/RBAC, and host network egress boundaries.
3. **Unknown transport**:
   - When transport is missing or ambiguous, keep `transport: unknown` and never mark transport-dependent controls `not-applicable` or `assessed`.
   - Restrict transport uncertainty to affected transport-dependent controls (such as `MCP07` transport/channel auth expectations); preserve usable transport-independent evidence (such as tool-manifest inspection for `MCP03`, source sinks for `MCP05`, or inventory approval mismatches for `MCP09`).
   - Aggregate each category conservatively from its reviewed vs unassessed controls: `partial` when usable transport-independent evidence exists alongside unassessed controls, and `not-assessed` when no usable evidence exists (such as name-only input).

## Deterministic Coverage Aggregation

Coverage describes which scoped controls have usable evidence, completely independent of whether findings exist:

| Coverage Label | Exact Condition |
| --- | --- |
| `assessed` | **Every** explicitly scoped applicable control in the stated evidence lane (e.g., supplied static) has usable evidence. Must state reviewed scope and excluded runtime claims. Does **not** imply zero risk. |
| `partial` | Some scoped controls have usable evidence, while other applicable or unknown-applicability controls lack usable evidence (including confirmed static finding + unassessed runtime enforcement). |
| `not-assessed` | Zero usable evidence exists for applicable or unknown-applicability scoped controls. |
| `not-applicable` | **All** scoped controls are demonstrably outside the integration's transport/scope with explicit rationale and source evidence. Never infer from missing data. |

- **Cross-integration aggregation**: Combine conservatively across all declared integrations in a category:
  - Mixed reviewed + unassessed across integrations $\rightarrow$ `partial`.
  - Zero reviewed controls and at least one integration is applicable/unknown $\rightarrow$ `not-assessed`.
  - All integrations have evidenced `not-applicable` rationale $\rightarrow$ `not-applicable`.
- **Category detail structure**: Beneath the 10-row `MCP01`–`MCP10` summary table, record per-control details specifying `integration_ref`, `control`, `boundary` (`client` | `server` | `host`), `evidence_lane` (`supplied-static` | `supplied-runtime`), `conclusion`, and `rationale`.
