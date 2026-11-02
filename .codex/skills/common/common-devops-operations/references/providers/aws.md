# AWS Provider Reference

## Official Integration Identity & Source

- **Provider**: Amazon Web Services (AWS)
- **Integration**: AWS MCP Server (part of Agent Toolkit for AWS)
- **Official Documentation**:
  - Agent Toolkit for AWS User Guide: `https://docs.aws.amazon.com/agent-toolkit/latest/userguide/`
  - Understanding MCP Server Tools: `https://docs.aws.amazon.com/agent-toolkit/latest/userguide/understanding-mcp-server-tools.html`
  - Setting up AWS MCP Server: `https://docs.aws.amazon.com/agent-toolkit/latest/userguide/getting-started-aws-mcp-server.html`
  - OAuth 2.1 Sign-In Access: `https://docs.aws.amazon.com/signin/latest/userguide/aws-mcp-server.html`
  - AWS IAM Best Practices: `https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html`
  - MCP Proxy for AWS CLI Distribution: `https://github.com/aws/mcp-proxy-for-aws`
- **Specification**: Model Context Protocol (MCP) version 2026-07-28; Streamable HTTP transport.
- **Documentation Access Date**: 2026-11-01.

## Architecture Distinction

- **Remote Managed MCP Server**: Endpoints follow `https://aws-mcp.<region>.api.aws/mcp`. Documented regions: `us-east-1`, `us-west-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`. Connects directly over Streamable HTTP; authenticates via OAuth 2.1 browser flow or bearer tokens with AWS Sign-In. Direct remote connection does **not** use a local executable pin or local CLI installation, and multi-profile account switching is not supported over OAuth.
- **Local Process Launch (SigV4 Proxy)**:
  - Distribution package: `mcp-proxy-for-aws-cli` — the version-pinned CLI distribution that freezes its whole dependency tree. The unsuffixed `mcp-proxy-for-aws` distribution is the library (loose dependency ranges) and is not the stdio launcher.
  - Command shape per the CLI argument parser (`mcp_proxy_for_aws/cli.py`): the endpoint is the **positional** argument, not a flag. There is no `--endpoint-url` option.
    `mcp-proxy-for-aws-cli https://aws-mcp.<region>.api.aws/mcp --region <region> [--profile <profile>]`
  - Documented optional arguments: `--service` (inferred from the endpoint when omitted), `--profile` (one or more profiles; first is the default, additional ones enable per-call `aws_profile` switching), `--region` (falls back to `AWS_REGION`), `--metadata KEY=value` (e.g. `AWS_REGION=us-west-2` for the default operation Region), `--read-only` (hides write-capable tools), `--disable-telemetry`.
  - Integrity & Provenance Contract: Any local process launch requires a consumer-approved exact pinned version or immutable cryptographic digest (`sha256`), locked dependencies, artifact provenance verification, and host process isolation. Running unpinned commands (such as unversioned `uvx`, `@latest`, or ad-hoc binary execution) is strictly prohibited. If provenance, signature, or artifact integrity cannot be verified, local launch is **unqualified** and blocked.
  - The endpoint Region selects the MCP server; without `AWS_REGION` metadata, AWS operations default to `us-east-1`. Record the endpoint Region and the operation Region separately.

## Supported Service Scope

The AWS MCP Server provides execution and knowledge primitives across AWS services accessible to the caller's IAM identity:
- **Knowledge & Documentation**: Architecture guidance, domain-specific skills, region catalog, service availability (`aws___retrieve_skill`, `aws___search_documentation`, `aws___read_documentation`, `aws___list_regions`, `aws___get_regional_availability`).
- **API Execution**: Sandboxed Python script execution (`aws___run_script`) and asynchronous task tracking (`aws___get_tasks`) for AWS SDK calls across compute (ECS, Lambda), storage (S3), networking (CloudFront, Route 53, VPC), database (RDS, DynamoDB), and management (CloudFormation, CloudWatch).
- **Artifact Handling**: Pre-signed S3 URL generation (`aws___get_presigned_url`) for secure artifact ingress and egress.
- **Negative Invariant**: Connecting to the AWS MCP Server does **not** grant universal AWS service access. Effective capability is strictly bounded by the authenticated IAM role, permission boundaries, and SCPs.

## Host Setup & Authentication

### Option A: Remote OAuth 2.1 (Direct Remote Connection)
1. Add MCP server endpoint for the target AWS region:
   `https://aws-mcp.<region>.api.aws/mcp` (or append `?oauth=initialize` if required by the client).
2. Administrative Provisioning: Ask an authorized administrator to review and provision the minimum required OAuth policy (`AWSMCPSignInOAuthAccessPolicy`) under organizational IAM governance. The agent must **never** attempt self-granting, modifying IAM policies, or running privilege escalation commands.
3. Complete OAuth authorization flow via browser or client token handler. Access tokens are valid for 1 hour; refreshable up to 12 hours.

### Option B: SigV4 via Local MCP Proxy (Terminal/IDE with Qualified Local Launcher)
1. Ensure AWS CLI (>=2.32.0) is configured with valid credentials (`aws login`, SSO, or IAM session) and confirm identity with `aws sts get-caller-identity`.
2. Launch the pinned CLI distribution with the endpoint as a positional argument:
   `mcp-proxy-for-aws-cli https://aws-mcp.<region>.api.aws/mcp --region <region>`
   Add `--profile <profile>` for a named credential profile (first profile becomes the default; extra profiles enable per-call `aws_profile` switching), `--read-only` for `monitor`/`diagnose` work, and `--metadata AWS_REGION=<region>` when the default AWS operation Region must differ from the endpoint Region.
3. Verify the launch is qualified: exact pinned version or verified `sha256` digest, locked dependency tree, and isolated process runner. Unpinned startup is a blocked local launch, not a fallback path.

## Account & Identity Verification

Before initiating any operation:
1. Verify caller identity using `sts:GetCallerIdentity` via `aws___run_script` (or authenticated preflight query).
2. Validate that `Account`, `Arn`, and active `AWS_REGION` match the approved target environment.
3. Reject execution and halt immediately (`wrong_target`) if the target account ID, partition, or role ARN does not match the authorized scope. Never proceed under ambient or default account assumptions.

## Discovered Tool-to-Operation Mapping

Execute `tools/list` on connection establishment. Tools actually discovered govern execution. Never assume tools exist without inspection.

| Operation | Discovered Tool | Action / Purpose |
| --- | --- | --- |
| `setup` | `aws___search_documentation`, `aws___read_documentation`, `aws___run_script` | Read-only inspection of CloudFormation templates, IAM role definitions, and service settings. |
| `deploy` | `aws___run_script`, `aws___get_presigned_url` | Upload deployment bundle via pre-signed S3 URL; execute CloudFormation stack update, ECS task definition update, or Lambda function code update. |
| `verify` | `aws___run_script` | Query outward resource state: ECS service stability, target group health, CloudFront distribution status, Lambda active state. |
| `monitor` | `aws___run_script` | Read CloudWatch metrics, evaluate CloudWatch alarms, inspect Route 53 health check status. |
| `diagnose` | `aws___run_script` | Query CloudWatch Logs Insights, AWS X-Ray traces, and CloudTrail event history. Strictly read-only; no state modification. |
| `recover` | `aws___run_script` | Execute approved runbook action: revert ECS task definition to previous revision, update Lambda alias to previous version, or trigger CloudFormation rollback. |

## Least-Privilege & Missing-Tool Handling

- **Least-Privilege Policy**: Never prescribe `AdministratorAccess` or wildcard `*` permissions. Ask the administrator to scope policies by exact action and resource ARN (e.g. `ecs:UpdateService` on `arn:aws:ecs:<region>:<account>:service/<cluster>/<service>`).
- **No Self-Granting**: The agent is strictly prohibited from attempting automated IAM writes, creating access keys, or modifying trust policies to resolve access errors.
- **Missing Capability**: If `aws___run_script` or a required tool is absent from the connection schema, return `missing_capability` with the exact tool name and reference link. Do **not** silently fall back to host shell or CLI.
- **Permission Denied**: If a tool call fails with `AccessDeniedException`, return `permission_denied` detailing the missing action, resource ARN, and request ID.

## Outward Checks, Deployment Identity & Rollback Constraints

- **Deployment Identifiers**: Container image digest (`sha256:...`), CloudFormation ChangeSet ID / Stack update time, Task Definition ARN revision (`...:task-definition/name:rev`), or Lambda Version ARN / CodeSHA256.
- **Outward Verification**: Check external ingress endpoint directly (DNS, TLS certificate, HTTP root response, status codes); verify CloudWatch alarm states remain OK.
- **Rollback Constraints**:
  - ECS: Update service to previous known-good Task Definition ARN.
  - Lambda: Shift alias traffic to previous known-good Version ARN.
  - CloudFormation: Initiate stack rollback or redeploy previous approved template.
  - Do not initiate rollback on unverified alerts alone; require confirmed incident/runbook authorization and verified previous artifact identity.

## Evidence Status

- **Documentation Reviewed**: YES (2026-11-01)
- **Connected**: NO (documentation reference only; no active connection established)
- **Authenticated**: NO (no credentials or tokens held)
- **Authorized**: NO (no evidenced target/action scope, effective permissions, or unexpired human approval held)
- **Live Verified**: NOT RUN (requires separately authorized live sandbox exercise)
