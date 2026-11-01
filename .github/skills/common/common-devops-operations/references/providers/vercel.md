# Vercel Provider Reference

## Official Integration Identity & Source

- **Provider**: Vercel
- **Integration**: Vercel Remote MCP Server
- **Official Documentation**:
  - Use Vercel MCP: `https://vercel.com/docs/agent-resources/vercel-mcp`
  - Vercel MCP Tools Reference: `https://vercel.com/docs/agent-resources/vercel-mcp/tools` (upstream updated 2026-09-15)
  - Deployments tools: `https://vercel.com/docs/agent-resources/vercel-mcp/tools/deployments`
  - Rolling Releases tools: `https://vercel.com/docs/agent-resources/vercel-mcp/tools/rolling-releases`
  - Instant Rollback: `https://vercel.com/docs/instant-rollback` (upstream updated 2026-07-07)
  - Access roles: `https://vercel.com/docs/rbac/access-roles`
- **Specification**: Model Context Protocol (MCP) version 2026-07-28; Streamable HTTP transport at `https://mcp.vercel.com`.
- **Documentation Access Date**: 2026-11-01.

## Architecture Distinction

- **Remote Managed MCP Server**: hosted at `https://mcp.vercel.com`; AI clients connect by URL over Streamable HTTP with OAuth. No local binary, package, or process launcher is used, so no local pin applies.
- **Vercel CLI Distinction**: `vercel` / `vc` is a separate local tool with separate authentication. MCP and CLI do **not** share credentials or sessions: a successful CLI command does not prove MCP access, and MCP operations never fall back to the CLI.

## Supported Service Scope

The reference catalog covers 217 catalog tools plus 31 workflow/widget tools. Availability depends on server configuration, client support, and team/project scope; some connections expose a smaller workflow tool list, and same-named tools can have different parameters. The schema returned by your connection governs execution — catalog coverage is not installed capability.

- **Projects & Deployments**: `list_projects`, `get_project`, `list_deployments`, `get_deployment`, `create_deployment`, `cancel_deployment`, build/runtime inspection.
- **Domains & DNS**, **Routing**, **Caching**, **Environment Variables**, **Feature Flags**, **Firewall**, **Sandboxes**, **Rolling Releases** (`start_rolling_release`, `approve_rolling_release_stage`, `complete_rolling_release`, `get_rolling_release`, `request_rollback`, `request_promote`, `list_promote_aliases`).
- **Observability**: `get_runtime_logs`, `get_runtime_errors`, Web Analytics tools.
- **Excluded by the catalog**: creating AI Gateway API keys, SSO token exchange, KMS private-key import, KMS message/token signing. Use the dashboard or CLI for those, outside this operation's authority.

## Host Setup & Authentication

### Remote Streamable HTTP Setup
```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}
```

### Authentication and Consent
1. Connect the client to `https://mcp.vercel.com`.
2. Complete the browser OAuth sign-in and authorize the client.
3. Grant access to the specific team(s) that own the target project. Adding the server URL does not complete authorization; without the grant, team-scoped tools stay unusable.
4. Existing Vercel permissions still apply after OAuth. Request the least-privilege role that permits the intended actions (see Least-Privilege).

## Account & Project Identity Verification

1. `list_teams` → confirm the authenticated team matches the approved scope.
2. `list_projects` / `get_project` → confirm the project ID (`prj_...`) and project name.
3. Identify the target environment explicitly: Production (`target: "production"`) versus Preview.
4. Halt with `wrong_target` if the team or project differs from the approved scope or the environment is ambiguous. Never mutate resources under a default or unverified team.

## Discovered Tool-to-Operation Mapping

Run `tools/list` first; the effective tool set depends on connection scope and the OAuth grant.

| Operation | Discovered Tool(s) | Action / Purpose |
| --- | --- | --- |
| `setup` | `get_project`, `list_projects`, domain tools | Inspect project configuration, domain assignment, and environment-variable names (never secret values). |
| `deploy` | `create_deployment`, `deploy_to_vercel` | Create a deployment; use `create_deployment` with `requestBody.target: "production"` for production. Poll `get_deployment` until `READY`, `ERROR`, or `CANCELED` before reporting the outcome. |
| `verify` | `get_deployment`, `web_fetch_vercel_url` | Confirm deployment state and fetch the deployment URL for TLS/HTTP checks. A `READY` state alone is not verification. |
| `monitor` | `get_runtime_logs`, `get_runtime_errors`, Web Analytics tools | Bounded log/error/analytics inspection. |
| `diagnose` | `get_runtime_logs`, `get_runtime_errors`, `get_deployment_build_logs` | Filter runtime or build logs by deployment and severity; read-only, no code or infrastructure mutation. |
| `recover` | `request_rollback`, `list_deployments` (`rollbackCandidate`) | Instant Rollback to an eligible prior production deployment. If `request_rollback` is absent from the schema, return `missing_capability` — do not approximate recovery with a redeploy or a rolling-release stage change. |

## Action Distinctions: Instant Rollback vs Promotion vs Redeploy

These have different effects and different gates. Classify by effect, never by the requested label.

1. **Instant Rollback** (`request_rollback`, `projectId` + `deploymentId` to roll back to, optional `description`)
   - Points production traffic at an **already-built** deployment; no new build and no new artifact digest.
   - **Eligibility differs by plan.** Hobby: can roll back only to the **immediately previous** deployment. Pro/Enterprise: any deployment previously **aliased to a production domain** is eligible. Deployments never aliased to production (most previews) are not eligible.
   - **Who may roll back**: on Pro/Enterprise, Owners, Members, and Developers; also a Project Administrator, or anyone holding the Full Production Deployment permission set. On Hobby, the previous-deployment rollback only.
   - **Behavioral side effects to expect and record**: Vercel treats the rolled-back deployment as a restored version of the previous deployment; the configuration used by that deployment may be stale; environment-variable changes made in project settings are **not** applied (the previous build returns); cron-job definitions are restored from the target deployment, and a project's **Disable Cron Jobs** setting persists across rollbacks and promotions; custom aliases are included only if they were present on that previous production deployment.
   - **One rollback at a time** per project. The rolled-back deployment stays disabled in the deployment list and can be re-reverted.
2. **Post-rollback state: production domain auto-assignment is disabled.** After a rollback, Vercel turns off automatic assignment of production domains, so new pushes to the production branch will not replace the rolled-back deployment. This is a lasting configuration change, not a transient flag: record it in the operations report. Verify it only through supported **read-only project state** — a discovered project/domain read tool that reports the domain auto-assignment setting — or other trustworthy provider/host evidence attributable to this project. If neither exists, record the state as documented but independently **UNVERIFIED**; do not claim verification, and do not treat an absent production promotion as evidence. A push-based exercise (pushing to the production branch to observe the outcome) creates a new push and build plus any connected integration effects, sits outside a rollback grant, and therefore requires its own authorization naming those effects and a discriminating observation; it is never the default verification.
3. **Undo / re-enable** (`request_promote`, `projectId` + `deploymentId`) — promoting a selected deployment re-enables automatic production-domain assignment; the documented dashboard "Undo Rollback" and `vercel promote` perform the same effect. Treat the promote as a production traffic change requiring authorization. Because MCP and CLI authenticate separately, do not run `vercel promote` as an agent fallback; if the promoting tool is absent, return `missing_capability` and hand the documented undo procedure to the authorized operator, noting that auto-assignment stays disabled until it is run.
4. **Promotion** of an existing preview deployment to production introduces a new release to production and must pass the full deploy gates.
5. **Redeploy** — `create_deployment` with `forceNew: "1"` bypasses deployment deduplication and triggers a fresh build producing a new artifact. It is deploy-bearing and must never be labeled or executed as recovery.

## Least-Privilege & Missing-Tool Handling

- **Least privilege**: authorize only the target team and project; prefer Viewer for monitoring/verification and the narrowest role that permits the approved write. Never require Owner access for routine inspection, and never widen a team grant to bypass an error.
- **Missing capability**: if the needed deployment, domain, log, or rollback tool is absent from the discovered schema, return `missing_capability` with the tools-reference link. Never invoke the local `vercel` CLI as a substitute.
- **Permission denied**: return `permission_denied` with the required team/project scope and the action that was refused; ask for a scoped grant, not a role escalation.
- **Uncertain write**: after a timeout or transport error on a deployment, rollback, or promote call, reconcile with `get_deployment`/`list_deployments` before retrying. Never infer failure from a timeout.

## Outward Checks, Deployment Identity & Rollback Constraints

- **Deployment identifiers**: deployment URL (`https://<project>-<hash>-<team>.vercel.app`), deployment ID (`dpl_...`), and Git commit SHA.
- **Outward verification**: fetch the deployment URL (via `web_fetch_vercel_url` or an external probe) and confirm HTTP status, TLS, and expected routing/404 behaviour; cross-check `get_deployment` state is `READY`.
- **Rollback preconditions**: explicit target deployment ID, verified eligibility for the plan, reviewed data/external-service compatibility (schema migrations, external API contracts), authorized human approval, and a recorded recovery of the post-rollback auto-assignment state.
- **Never** trigger automatic rollback from an alert or a transient error spike, and never promise telemetry the plan or connection does not expose.

## Evidence Status

- **Documentation Reviewed**: YES (2026-11-01)
- **Connected**: NO (documentation reference only; no active connection established)
- **Authenticated**: NO (no credentials or tokens held)
- **Authorized**: NO (no evidenced target/action scope, effective permissions, or unexpired human approval held)
- **Live Verified**: NOT RUN (requires separately authorized live sandbox exercise)
