# Cloudflare Provider Reference

## Official Integration Identity & Source

- **Provider**: Cloudflare
- **Integration**: Cloudflare API MCP Server
- **Official Documentation**:
  - Cloudflare's Own MCP Servers: `https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/`
  - Cloudflare MCP GitHub Repository: `https://github.com/cloudflare/mcp`
  - Cloudflare API Documentation: `https://developers.cloudflare.com/api/`
  - Workers Deployments API: `https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/`
  - Workers Rollbacks Guide: `https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/`
- **Specification**: Model Context Protocol (MCP) version 2026-07-28; Streamable HTTP transport at `/mcp`.
- **Documentation Access Date**: 2026-11-01 (last updated upstream 2026-10-27).

## Architecture Distinction

- **Remote Managed MCP Server**: Hosted at `https://mcp.cloudflare.com/mcp`. Implements the search-and-execute Code Mode pattern, executing JavaScript against typed representations of the Cloudflare OpenAPI spec inside an isolated Dynamic Worker sandbox. Uses Streamable HTTP; no local executable binary or local pin is required or supported.
- **Product-Specific Remote Servers**: Optional specialized remote endpoints (e.g. `https://browser.mcp.cloudflare.com/mcp` for browser rendering, `https://docs.mcp.cloudflare.com/mcp` for documentation search, `https://containers.mcp.cloudflare.com/mcp` for sandbox development). These are independent remote servers, not local tools.
- **Constraint**: Remote MCP operates via HTTP endpoints. Local executable pins are inapplicable to Cloudflare remote servers.

## Supported Service Scope

The Cloudflare API MCP server covers endpoints across the Cloudflare platform:
- **Application Services**: Cloudflare Workers, Pages, Durable Objects, D1, KV, Queues, R2, Vectorize.
- **Networking & DNS**: Authoritative DNS records, custom domains, load balancing, SSL/TLS certificates, Page Rules, Transform Rules.
- **Security & Zero Trust**: Cloudflare WAF, Rate Limiting, Cloudflare Access, Gateway policies, CASB.
- **Observability**: GraphQL Analytics API, Worker Tail logs, Logpush job management.

## Host Setup & Authentication

### Remote Streamable HTTP Setup
Add the server configuration to the MCP client:
```json
{
  "mcpServers": {
    "cloudflare-api": {
      "url": "https://mcp.cloudflare.com/mcp"
    }
  }
}
```

### Authentication Types
1. **OAuth 2.1**: Interactive client connection where the user completes browser consent, granting the agent access to specific accounts and zones.
2. **User API Token**: Bearer token created under a specific user profile with scoped permissions across authorized accounts and zones.
3. **Account API Token**: Bearer token scoped strictly to a single Cloudflare account.

## Account, Zone & Token Identity Verification

Before initiating any mutation or inspection:
1. **Token Validity Preflight**: Calling `GET /user/tokens/verify` proves only token status (active), token ID, and validity dates. It does **not** prove target account or zone binding, nor does it prove permission over a specific resource.
2. **Target Resource Resolution**: The agent must separately query authorized accounts (`GET /accounts`) or zones (`GET /zones`) using the discovered tools to verify that the target Account ID and Zone ID are present within the token's effective grant.
3. **Strict Target Binding**: If the target Account ID or Zone ID cannot be positively confirmed as authorized within the token/OAuth scope, halt immediately with `wrong_target`. Never execute operations under assumed or unverified target contexts.

## Discovered Tool-to-Operation Mapping

The Code Mode MCP server exposes a compact tool interface: `search()`, `execute()`, and `docs()`.

| Operation | Discovered Tool | Action / Purpose |
| --- | --- | --- |
| `setup` | `search()`, `execute()` | Query zone DNS records, inspect SSL/TLS encryption mode, verify custom domain bindings and edge rules. |
| `deploy` | `search()`, `execute()` | Deploy Cloudflare Worker script, create Worker version, publish Pages build, or configure route mappings. |
| `verify` | `search()`, `execute()` | Query deployment status, verify DNS propagation, check SSL certificate validity, validate origin response. |
| `monitor` | `search()`, `execute()` | Query GraphQL Analytics API for edge requests, bandwidth, 5xx status codes, and Worker invocation metrics. |
| `diagnose` | `search()`, `execute()` | Inspect Worker Tail logs or examine Logpush job delivery logs. Strictly read-only; no configuration changes. |
| `recover` | `search()`, `execute()` | Execute rollback by creating a new deployment referencing an approved prior `version_id` with 100% traffic allocation (`POST /accounts/{account_id}/workers/scripts/{script_name}/deployments`). If deployment creation tools are missing, return `missing_capability`. |

## Least-Privilege & Missing-Tool Handling

- **Least-Privilege Token Scoping**: Never use the Global API Key or assign Account Administrator permissions. Create scoped API Tokens with minimum required permissions:
  - DNS Management: `Zone:DNS:Edit` (or `Zone:DNS:Read` for read-only modes).
  - Worker Deployment: `Account:Workers Scripts:Edit`, `Account:Workers KV:Edit`.
  - Analytics / Monitoring: `Zone:Analytics:Read`, `Account:Workers Analytics:Read`.
- **Missing Capability**: If Code Mode `execute()` is blocked or unavailable, return `missing_capability` with the link to `https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/`. Do **not** fall back to local `wrangler` CLI commands.
- **Permission Denied**: If a Cloudflare API call returns HTTP 403 or error code 10000, return `permission_denied` with the missing permission scope, Account/Zone ID, and token guidance.

## Outward Checks, Deployment Identity & Rollback Constraints

- **Deployment Identifiers**: Worker Version ID (`uuid`), Deployment ID (`uuid`), Pages Deployment ID, or Commit SHA.
- **Outward Verification**: Probe public custom domain directly (TLS certificate validity, HTTP status, edge cache headers `cf-ray`, `cf-cache-status`); verify Worker script returns expected response body.
- **Telemetry Limits**: Static assets (Cloudflare Pages or Workers Assets) have edge request metrics and HTTP logs; they do **not** provide container runtime logs or process telemetry. Do not expect OS-level logs for serverless/edge workloads.
- **Worker Rollback Constraints & Restorations**:
  - Rollback Mechanism: Rollback does not revert a deployment record; it creates a **new deployment** pointing to a prior verified `version_id` with 100% traffic (`POST .../deployments`).
  - Deleted Binding Restriction: Rollback will fail if the target prior version depends on resource bindings (KV, D1, R2, Queues) that have been deleted since that version was built.
  - Durable Object Migration Restriction: Rollback cannot be executed if the prior version does not satisfy active Durable Object class migrations or schema changes.
  - Rollback requires human authorization and verified previous `version_id`. Never trigger automatic rollback based solely on transient edge metric spikes.

## Evidence Status

- **Documentation Reviewed**: YES (2026-11-01)
- **Connected**: NO (documentation reference only; no active connection established)
- **Authenticated**: NO (no credentials or tokens held)
- **Authorized**: NO (no evidenced target/action scope, effective permissions, or unexpired human approval held)
- **Live Verified**: NOT RUN (requires separately authorized live sandbox exercise)
