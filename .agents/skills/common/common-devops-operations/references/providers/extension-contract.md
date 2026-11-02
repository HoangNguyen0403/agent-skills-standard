# Provider Extension Contract

## Intent

This contract defines the mandatory specification and interface requirements for onboarding a new cloud or infrastructure provider into the provider-neutral DevOps operations framework (`common-devops-operations` / `deploy-release`) without requiring modifications to core workflows or skills.

Any new provider reference document placed under `references/providers/<provider-key>.md` must satisfy all schema sections, positive invariants, and negative safety constraints defined below.

## Mandatory Specification Sections

Every provider reference document must contain the following standard sections:

### 1. Official Integration Identity & Source
- **Official Provider**: Registered vendor / platform name.
- **Integration Identifier**: Official MCP server name or integration package.
- **Authoritative Sources**: Exact vendor documentation URLs and repository links.
- **Specification Version**: Protocol version (e.g. MCP version 2026-07-28, Streamable HTTP transport, JSON-RPC 2.0).
- **Access Date**: Date documentation was reviewed and verified (format: `YYYY-MM-DD`).

### 2. Architecture Distinction & Local Integrity Contract
- Explicitly categorize the integration architecture:
  - **Remote Managed MCP Server**: HTTP/SSE endpoint hosted on provider infrastructure. Direct remote connections must **not** declare fictional local executable pins or local CLI requirements.
  - **Local Process Launch**: Local stdio process running via a pinned launcher (e.g. standalone binary, CLI package).
- **Local Launcher Integrity Requirements**: Any local process launch must specify:
  1. Exact distribution package name (distinguishing CLI distributions from internal libraries).
  2. Consumer-approved exact pinned version or immutable cryptographic digest (`sha256`).
  3. Artifact provenance and dependency lockfile verification.
  4. Explicit process isolation controls.
  - If artifact provenance, signature, or dependency integrity cannot be verified, the local launcher is **unqualified** and blocked.

### 3. Supported Service Scope
- Explicitly enumerate the specific cloud services supported by the MCP server (e.g. storage, compute, DNS, observability).
- State explicit boundaries and non-supported services.
- **Negative Invariant**: A connected MCP session must never be claimed to grant universal cloud provider service access. Only services backed by discovered tools and authorized IAM permissions are in scope.

### 4. Host Setup & Authentication
- Clear setup configuration snippet for AI clients (e.g. client JSON configuration with `url` or `command`/`args`).
- Authentication mechanism: OAuth 2.1, SigV4, API Token, or federated identity.
- Explicit prohibition against automated self-granting: Setup instructions must direct administrative provisioning under organizational policy rather than instructing agents to grant themselves IAM policies or access keys.

### 5. Account & Project Identity Verification
- Mandatory preflight checks to resolve and bind the authenticated principal, organization/tenant ID, account/project ID, and target region.
- Distinguish token validity from target scope binding: A valid token response proves only credential active status; target account/project/zone binding must be positively verified via authorized resource queries.
- Bind three values separately, and never let one stand in for another:
  1. **Authenticated principal** — the identity the credential represents. Resolve it from trusted host/provider authentication context bound to the MCP connection; a successful resource query is a permission/access probe and is never a substitute for principal identity. Unresolved identity blocks live operations.
  2. **Quota/billing attribution** — a project or account charged for usage (for example a quota-project header). Attribution is not target selection and does not prove authorization over the target.
  3. **Target resource** — supplied in each tool call's own resource argument (resource name, container path, or ID). Document every per-tool resource argument and any provider limit on how many resource containers one call may span.
- Hard block requirement: If the resolved target identity does not match the authorized operational scope, execution must halt immediately with `wrong_target`. Never proceed under ambient or default identity assumptions.

### 6. Discovered Tool-to-Operation Mapping
- Tool execution must be dynamically governed by `tools/list` schema inspection on connection establishment.
- Derive header routing dynamically: In MCP 2026-07-28, inspect tool input schemas for `x-mcp-header` properties to determine the actual HTTP headers required by the server (e.g. `X-Goog-User-Project`), rather than transmitting a literal header.
- Map discovered tools to the six canonical DevOps operations:
  1. `setup`: Read-only inspection of hosting, DNS, TLS, and infrastructure configurations.
  2. `deploy`: Executing authorized deployment, updating container/service revisions, or uploading release bundles.
  3. `verify`: Inspecting outward target origin health, TLS validity, routing, and HTTP status codes.
  4. `monitor`: Querying metrics, time series data, alerts, and service health checks.
  5. `diagnose`: Querying logs, error traces, and operational telemetry. Strictly read-only; no infrastructure modifications.
  6. `recover`: Executing pre-approved runbook mitigations or rolling back to an explicitly identified prior artifact/revision.
- If the requested **effect** is unsupported by the discovered schema — or the specific tool the effect requires is absent — report `missing_capability`; never invent fallback mechanisms.
- Read-only tools are **sufficient** for the read-only operations `setup`, `verify`, `monitor`, and `diagnose`. Do not report `missing_capability` merely because a tool is annotated or documented as read-only. Report it only when the requested operation's effect cannot be produced by any discovered tool, for example a requested `deploy`, `setup` write, or `recover` mutation with no corresponding tool.
- Map operations to the provider's documented **MCP tool names**, not to REST/gRPC method labels, and treat the discovered schema as the authority on what exists.

### 7. Action Distinctions: Rollback vs Redeploy vs Promotion
- Explicitly differentiate recovery mechanisms:
  - **Rollback**: Restoring traffic to a verified, already-built prior artifact/revision (e.g. Vercel Instant Rollback, Cloudflare Worker deployment referencing prior `version_id`). Requires verifying data/schema compatibility and external resource bindings (e.g. deleted bindings or database migrations).
  - **Redeploy / Fresh Build**: Rebuilding source code creates a new artifact digest. It is deploy-bearing and must pass full deploy gates.
  - **Promotion**: Promoting a preview/staging release to production introduces a new release and must pass full deploy gates.
- Document provider eligibility limits and side effects of recovery, per plan or tier (for example: a lower tier may only roll back to the immediately previous deployment; a rollback may alter project configuration such as disabling automatic production-domain assignment). Record that post-recovery state and verify it only through supported read-only provider state or trustworthy provider/host evidence; when neither exists, mark it documented-but-independently-**UNVERIFIED** rather than claiming verification. An authorized undo or promotion is what re-enables normal behavior, so state it explicitly instead of assuming recovery restored the prior configuration; a new push or build used to observe behavior is a separate side-effecting action needing its own authorization, and the absence of an observed change is not evidence.

### 8. Least-Privilege & Missing-Tool Handling
- Prescribe least-privilege role definitions and minimal permission scopes.
- Prohibit prescribing blanket administrative roles (`AdministratorAccess`, `roles/owner`, Account Owner) solely to bypass quickstart permissions issues.
- Standard error responses:
  - `missing_mcp`: MCP server is not configured in client.
  - `disconnected_mcp`: MCP server endpoint is unreachable.
  - `missing_capability`: Required tool is absent from connection schema.
  - `permission_denied`: Tool call fails due to IAM/authorization refusal.
  - `approval_required` / `approval_expired`: Human approval missing or expired.
- Prohibition on CLI fallback: Never silently fall back to ambient host shell or CLI commands when an MCP tool is missing or unauthorized.

### 9. Outward Checks, Deployment Identity & Rollback Constraints
- Define the provider's native deployment identity tokens (e.g. revision ID, task definition ARN, commit SHA, deployment URL).
- Define provider-specific outward verification methods (direct HTTP/TLS probing vs edge header checks).
- Document telemetry distinctions: Differentiate serverless/static edge telemetry (request metrics, edge logs) from container/VM runtime telemetry (OS logs, process metrics).

### 10. Separation of Authentication, Authorization & Evidence Status
Every provider reference must explicitly separate authentication from authorization across five distinct evidence axes:
- **Documentation Reviewed**: `YES` or `NO` with verification date.
- **Connected**: `YES` or `NO` (active MCP connection established).
- **Authenticated**: `YES` or `NO` (valid, unexpired credentials/tokens presented).
- **Authorized**: `YES` or `NO` (evidenced target/action scope, effective provider permissions, organizational authority, and applicable human approval with expiry).
- **Live Verified**: `PASS`, `FAIL`, or `NOT RUN` (independently observed in an authorized test environment).

**Inviolable Rule**: Credential possession (`Authenticated: YES`) does **not** establish authorization (`Authorized: YES`). An operator possessing valid credentials but lacking explicit target scope approval, effective least-privilege permissions, or an unexpired human grant must be recorded as `Authorized: NO` and blocked from mutating state.

## Invariant Checklist for New Provider References

Before approving a new provider reference, verify:
- [ ] No universal service access claimed from a single MCP connection.
- [ ] Tools actually discovered govern execution; no hardcoded assumption of catalog completeness.
- [ ] Remote MCP endpoints and local process launchers are clearly distinguished; local launchers require provenance, immutable digest, and dependency locking.
- [ ] No CLI fallback, shell commands, or ambient credential switching prescribed.
- [ ] Least-privilege IAM policies specified; no blanket Admin/Owner roles prescribed; no self-granting instructions.
- [ ] Read-only modes (`monitor`, `diagnose`) strictly prohibited from mutating state.
- [ ] Rollback, redeploy, and promotion are kept functionally distinct.
- [ ] Authentication is strictly separated from authorization; unapproved credential possession does not grant authorization.
- [ ] Quota/billing attribution is documented separately from the target resource, and each tool's own resource argument is enumerated.
- [ ] Read-only operations are not refused for being read-only; `missing_capability` is reserved for effects the discovered schema cannot produce.
- [ ] Evidence status explicitly states documentation review status and marks unexecuted live verification as `NOT RUN`.
