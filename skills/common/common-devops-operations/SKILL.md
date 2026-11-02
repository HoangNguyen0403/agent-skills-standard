---
name: common-devops-operations
description: 'Execute provider-neutral DevOps operations across AWS, GCP, Cloudflare, and Vercel. Standardizes MCP preflight, identity and authorization, effect-based release gating, and outward verification for setup, deploy, verify, monitor, diagnose, and recover. Use when managing cloud infrastructure, deploying releases, or diagnosing operational issues. (triggers: devops operations, cloud deployment, hosting verification, deployment diagnosis, cloud monitoring, deployment recovery)'
metadata:
  triggers:
    files: []
    keywords:
      - devops operations
      - cloud deployment
      - hosting verification
      - deployment diagnosis
      - cloud monitoring
      - deployment recovery
---

# Provider-Neutral DevOps Operations

## **Priority: P1 (HIGH)**

Single operations entrypoint for cloud infrastructure and services. MCP tools and discovered capabilities govern execution; organizational policy and host controls govern authorization.

## Operational Lifecycle

Every operation follows seven mandatory stages:

1. **Discover MCP**: Verify required provider MCP is installed, connected, and advertising necessary tools. No silent CLI fallback.
2. **Verify Identity & Scope**: Confirm authenticated principal, organization/account, project/resource, region, and environment.
3. **Identify Policy & Capabilities**: Match discovered tool capabilities against target organizational security policy.
4. **Propose & Authorize**: Present concrete action set, target, artifact identity, risk, and expiry to authorized human.
5. **Execute Bounded Operation**: Perform authorized mutations with bounded deadlines and idempotency tokens.
6. **Independently Verify**: Inspect outward system behavior from target origin, separate from mutation operator.
7. **Reconcile & Report**: Emit standardized operations report; reconcile actual state; preserve feature lifecycle.

## Core Operations

Default `operation=deploy` when omitted. Reject unknown, typo, or conflicting modes.

| Operation | Scope | Verification Requirement |
| --- | --- | --- |
| `setup` | Hosting, DNS, TLS configuration | Valid DNS records, TLS handshake, origin routing |
| `deploy` | Release promotion, artifact rollout | Outward origin check, mobile C6, rollback readiness |
| `verify` | Health check, routing, headers | Root response, valid TLS, 404 on unknown path |
| `monitor` | Metrics, alerts, quota inspection | Measured signals; missing telemetry is not health |
| `diagnose` | Bounded hypothesis investigation | Evidence collection; no writes disguised as diagnosis |
| `recover` | Incident mitigation from prior state | Restored healthy state; unverified build forbidden |

## Effect-Based Eligibility

Classify operations by real-world effect, never by mode label alone:

- **Deploy-Bearing Actions**: Any traffic switch or configuration introducing a new release enters full deploy readiness gates, even under `setup` or `recover`.
- **Read-Only Mode Lock**: `verify`, `monitor`, and `diagnose` cannot execute writes. Mutation requests block and require renewed authorization.
- **Recovery Boundary**: `recover` applies fixed runbook mitigations against an identified prior artifact or state. Fresh builds require release workflows. Active harm retains `incident-hotfix` policy; containment retains `cyber-triage`.

## Positive & Negative Invariants

- **Positive Invariants**:
  - Authorized, scoped operations proceed with least-privilege discovered tools.
  - Irrelevant or unconfigured providers do not block independent analysis of configured targets.
  - Offline review proceeds with explicit evidence limit when MCP is absent.
- **Negative Invariants**:
  - No implicit credentials, ambient CLI fallbacks, or automatic tool installations.
  - No agent self-approval, role expansion, or making resources public to bypass errors.
  - No secret values, credentials, or tokens in reports, receipts, or logs.
  - No timeout-as-failure retry; reconcile actual resource state before re-attempting.

## Detailed References

- [Authorization & Host Enforcement](references/authorization.md) — Scope binding, approval invalidation, enforcement evidence checklist.
- [MCP Preflight & Capabilities](references/mcp-preflight.md) — Connection schema, tool discovery, structured missing-MCP outcomes.
- [Operations & Effect Classification](references/operations.md) — Six operations, diagnostic side effects, uncertain-write reconciliation.
- [Orchestration & Verification](references/orchestration.md) — Single context, specialist briefs, caller-return semantics, monitoring contract.
- [Evidence & Reporting Matrix](references/evidence.md) — Operations report shape, lifecycle preservation, consumer gap handling.
- **Provider References** — Read the matching file before any provider operation: [AWS](references/providers/aws.md), [GCP](references/providers/gcp.md), [Cloudflare](references/providers/cloudflare.md), [Vercel](references/providers/vercel.md).
- **Provider Extension Contract** — Read before onboarding a new provider: [Extension Contract](references/providers/extension-contract.md).
