# Google Cloud Platform (GCP) Provider Reference

## Official Integration Identity & Source

- **Provider**: Google Cloud Platform (GCP)
- **Integration**: Google Cloud remote MCP servers — Cloud Monitoring (`monitoring.googleapis.com`) and Cloud Logging (`logging.googleapis.com`)
- **Official Documentation**:
  - Use the Cloud Monitoring remote MCP server: `https://docs.cloud.google.com/monitoring/docs/use-monitoring-mcp` (upstream `Last updated 2026-10-29`)
  - Use the Cloud Logging remote MCP server: `https://docs.cloud.google.com/logging/docs/use-logging-mcp`
  - MCP Reference — monitoring.googleapis.com: `https://docs.cloud.google.com/monitoring/api/ref_v3_mcp/mcp` (upstream `Last updated 2026-08-07`)
  - MCP Reference — logging.googleapis.com: `https://docs.cloud.google.com/logging/docs/reference/v2_mcp/mcp` (upstream `Last updated 2026-08-07`)
  - System parameters (`X-Goog-User-Project`): `https://docs.cloud.google.com/apis/docs/system-parameters`
  - Authenticate to Google Cloud MCP servers: `https://docs.cloud.google.com/mcp/authenticate-mcp`
  - Local MCP servers (preview upstream): `https://github.com/googleapis/gcloud-mcp`
- **Specification**: MCP 2026-07-28 stateless core (no `initialize`/`initialized` handshake and no `Mcp-Session-Id`; each request carries what it needs in headers or `_meta`); Streamable HTTP transport.
- **Documentation Access Date**: 2026-11-01.

## Architecture Distinction

- **Remote Managed MCP Servers** — `https://monitoring.googleapis.com/mcp` and `https://logging.googleapis.com/mcp`. Run on Google Cloud infrastructure, become available when the corresponding Cloud API is enabled, and speak Streamable HTTP. Direct remote connections do **not** use a local executable pin or local installation.
- **Header routing (`x-mcp-header`)** — In MCP 2026-07-28, the server mirrors selected tool input parameters into HTTP headers. The tool's input schema marks them with the `x-mcp-header` property, and the property value names the actual header (for example `X-Goog-User-Project`). Read the discovered schema and populate the named header; never send a literal header called `x-mcp-header`.
- **Local Process Launch** — `@google-cloud/observability-mcp` (Observability-only tools) and `@google-cloud/gcloud-mcp` (gcloud CLI wrapper) are distinct published packages. The publishing repository states it is in preview, is not an officially supported Google product, and is not covered by Google Cloud Terms of Service. Local and remote servers are **different capability sets**: local-only tools (for example log sink listing) MUST NOT be attributed to the remote server.
- **Local integrity** — pinned exact package version, verified package digest/signature, dependency lockfile, and an isolated process runner; unpinned `npx` or global installs are prohibited. If provenance or integrity cannot be proven, local launch is unqualified and blocked.

## Supported Service Scope

Catalog-derived scope for the remote servers only. These are documented MCP **tool** names; REST method labels such as `projects.timeSeries.list` are API methods, not tools.
- **Cloud Monitoring** (9 documented tools): `list_timeseries`, `query_range`, `list_metric_descriptors`, `list_alert_policies`, `get_alert_policy`, `list_alerts`, `get_alert`, `list_dashboards`, `get_dashboard`.
- **Cloud Logging** (6 documented tools): `list_log_entries`, `list_log_names`, `list_buckets`, `get_bucket`, `list_views`, `get_view`.
- **Not exposed by the remote catalogs** — return `missing_capability`; never substitute:
  - Uptime-check **configuration** inspection. No uptime-check tool exists. Uptime health is observable only as time-series metric data through `list_timeseries`/`query_range`, using metric types discovered by `list_metric_descriptors`; metric values are not check configuration.
  - Cloud Logging monitored-resource-**descriptor** queries, log sinks, log scopes, and traces.
  - Any state mutation: alert acknowledgement, alert-policy edits, bucket/sink changes, log writes.
- **Negative invariants**: a connected Monitoring or Logging session never implies general GCP control (Cloud Run, GKE, Compute Engine, Cloud DNS, deployment tooling). Only discovered tools plus the principal's granted permissions are in scope. Catalog counts describe the catalog at the access date; the schema returned by `tools/list` governs execution.

## Host Setup & Authentication

### Remote Streamable HTTP Setup
1. Enable the Cloud Monitoring API or Cloud Logging API for the project that hosts MCP enablement, then add the endpoint in the client:
   - Monitoring: `https://monitoring.googleapis.com/mcp`
   - Logging: `https://logging.googleapis.com/mcp`
   - Transport: Streamable HTTP.
2. Authenticate with a Google Cloud identity, an OAuth client ID and secret, or an agent/workload identity. Prefer a dedicated agent identity over a human identity so scope stays bounded and actions stay attributable. `tools/list` itself requires no authentication.
3. **Administrator provisioning only.** Google documents the required predefined roles as `roles/mcp.toolUser` (contains `mcp.tools.call`) plus the service role for the server in use — `roles/monitoring.admin` for Monitoring and `roles/logging.admin` for Logging — and notes that custom roles may also supply the permissions. Where policy permits, request the narrower custom role containing only the read permissions your operations need. Never request `roles/owner` or `roles/editor`, and never attempt an IAM write from the agent.
4. Documented MCP tool OAuth scopes: Monitoring `https://www.googleapis.com/auth/monitoring` and `https://www.googleapis.com/auth/monitoring.write`; Logging `https://www.googleapis.com/auth/logging.admin` and `https://www.googleapis.com/auth/logging.write`. Additional scopes can be required on the resources a call touches. Read-only behaviour comes from granted permissions and each tool's own read semantics; do not invent an undocumented scope.

## Principal, Quota Project & Resource Project Binding

Three values must be bound **separately**. Treating one as another is a wrong-target defect:

1. **Authenticated principal** — the identity behind the token (user, service account, workload identity, or agent identity). No MCP tool reports it, and no tool call can substitute for it: a successful `list_*` query proves only that the credential can currently read that resource — a permission/resource-access probe, never identity. Resolve the principal only from a trusted host or provider authentication context bound to this MCP connection (for example the host's authenticated account/identity for the connection, or a provider-issued token identity the host exposes and can attribute to the connection). If no such context is available, live operations are blocked with `unauthenticated` for unresolved identity; state the gap explicitly instead of presenting a probe result as the principal.
2. **Quota/billing attribution project** — the optional `X-Goog-User-Project` header (system parameter `$userProject`) selects the project charged for **quota and billing**; the caller must hold `serviceusage.services.use` on it. It does **not** select the data/resource project and never proves authorization over the target project.
3. **Target resource project** — supplied per tool call in the tool's own resource argument:
   - Monitoring `list_timeseries` → `name` = `projects/[PROJECT_ID_OR_NUMBER]` (also accepts `organizations/[ORGANIZATION_ID]` and `folders/[FOLDER_ID]`).
   - Logging `list_log_entries` → `resourceNames` = `projects/[PROJECT_ID]`, or a specific log view `projects/[PROJECT_ID]/locations/[LOCATION_ID]/buckets/[BUCKET_ID]/views/[VIEW_ID]`, or another container path; maximum 100 resources. The deprecated `projectIds` field is not the preferred form.
   - **Constraint**: `list_log_entries` works with a **single resource project** per call; calls spanning multiple resource projects fail.
   - Bucket and view tools take the corresponding bucket or view resource name.

Bind all three, then halt with `wrong_target` before any call whose resource argument or attributable project differs from the approved scope. Never operate under the default or ambient project.

## Discovered Tool-to-Operation Mapping

Run `tools/list` on connection. Discovered schema tools govern execution; entries below are the documented catalog, not a guarantee that your connection exposes them.

| Operation | Discovered Tool(s) | Action / Purpose |
| --- | --- | --- |
| `setup` | `list_dashboards`, `get_dashboard`, `list_alert_policies`, `get_alert_policy`, `list_metric_descriptors`, `list_log_names`, `list_buckets`, `get_bucket`, `list_views`, `get_view` | Read-only inspection of configured dashboards, alerting policies, metric types, and logging buckets/views. Uptime-check configuration inspection → `missing_capability`. |
| `deploy` | *none* | `missing_capability`. These observability servers expose no deployment or configuration-write tool; a deployment requires separately connected deployment tooling. |
| `verify` | `list_timeseries`, `query_range` | Deployment-outcome signals (error rate, latency, saturation) for the target resource. MCP provides no origin probe, so TLS/HTTP/404 checks come from the host's outward verification path; if that is unavailable, report `missing_capability` rather than inferring success from metrics. |
| `monitor` | `list_timeseries`, `query_range`, `list_alerts`, `get_alert`, `list_alert_policies` | Bounded metric and alert inspection, including active violations. |
| `diagnose` | `list_log_entries`, `get_alert` | Filtered log search and alert detail for root-cause evidence. Read-only; no infrastructure modification. |
| `recover` | *none* | `missing_capability`. No acknowledgement, muting, threshold change, or workload rollback exists in these catalogs. |

## Least-Privilege & Missing-Tool Handling

- **Least-privilege posture**: scope grants at the target project, prefer a custom read-only role where policy allows, and use a dedicated agent identity. Never widen to `roles/owner`/`roles/editor` or to an organization-level grant to resolve an error.
- **Permission denied**: return `permission_denied` with the project ID, the tool call, and the missing permission or role; ask the administrator to review the minimum action/resource scope. Do not retry with a broader identity.
- **Missing tool**: if a needed tool is absent from the discovered schema, return `missing_capability` with the exact tool name and the catalog reference. Do not attempt gcloud CLI or shell fallback.
- **Read-only modes**: `monitor` and `diagnose` never mutate. These catalogs cannot mutate anyway; if a future tool can, reclassify the action and re-authorize.

## Outward Checks, Deployment Identity & Rollback Constraints

- **Deployment identifiers** (from the deployment owner, not from these servers): Cloud Run revision name, GKE pod template hash, or container image digest.
- **Outward verification**: probe the public service URL directly (TLS certificate, HTTP root response, expected unknown-path 404 where the contract requires it). Alert and metric state are supplementary, never a substitute for the outward probe.
- **Rollback constraints**: revision/traffic shifts require separate deployment tooling with explicit prior-revision identity, data-compatibility review, and human authorization. These MCP servers return `missing_capability` for recovery actions.
- **Telemetry limits**: Monitoring exposes metric time series and alert state; Logging exposes log entries and bucket/view metadata. Neither proves workload health on its own, and missing telemetry is not health.

## Evidence Status

- **Documentation Reviewed**: YES (2026-11-01)
- **Connected**: NO (documentation reference only; no active connection established)
- **Authenticated**: NO (no credentials or tokens held)
- **Authorized**: NO (no evidenced target/action scope, effective permissions, or unexpired human approval held)
- **Live Verified**: NOT RUN (requires separately authorized live sandbox exercise)
