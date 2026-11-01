# MCP Preflight & Capabilities

## Preflight Protocol

Live cloud operations require an installed, connected Model Context Protocol (MCP) server exposing verified provider tools.

1. **Inspect Connection**: Verify the MCP connection is active and responsive.
2. **Discover Tools**: Read advertised tool definitions and schemas dynamically from the connected MCP session.
3. **Validate Scope**: Confirm the discovered tools match the target provider and operation capability requirements.

### Tool Discovery vs. Catalog Claims

- Vendor documentation, marketing claims, and public registries represent advertised capabilities only.
- Execution is strictly governed by tools actually discovered in the active session schema.
- If a provider document advertises a tool that is not returned during discovery, treat the capability as missing (`missing_capability`).
- Do not fall back to local shell CLI commands or ambient cloud SDKs when an MCP tool is absent.

## Standard Outcome Vocabulary

All operational decisions and blockage points must use this standardized vocabulary:

| Outcome Code | Meaning | Immediate Action |
| --- | --- | --- |
| `missing_mcp` | Required provider MCP server is not registered | Return setup instructions; request user installation |
| `disconnected_mcp` | MCP server is registered but connection failed | Guide user to check daemon, network, or process state |
| `unauthenticated` | Principal credentials absent, expired, or invalid | Prompt re-authentication via official CLI/OIDC outside chat |
| `wrong_target` | Target account, project, or resource mismatch | Halt immediately; report detected vs approved target |
| `missing_capability` | Connected MCP lacks required action tool | Report missing tool; restrict operation or halt |
| `permission_denied` | Cloud provider IAM refused requested action | Formulate least-privilege administrator review request |
| `approval_required` | Mutating action lacks required human approval | Submit action proposal to authorized human |
| `approval_expired` | Approval timestamp is in the past | Request fresh human approval with updated state |
| `unsupported_enforcement` | Host lacks required scope fence or audit sink | Halt production mutations; record enforcement gap |
| `uncertain_write` | Mutation timed out or returned ambiguous status | Execute read-only state reconciliation before retry |
| `verification_failed` | Outward post-execution checks did not pass | Halt promotion; engage recovery plan |

## Handling Missing MCP

When the required MCP server is absent:

1. **Do Not Auto-Install**: Never invoke package managers or download binaries in the background.
2. **Do Not Ask for Secrets**: Never request API keys, passwords, or session tokens in conversation.
3. **Emit Actionable Guidance**:
   - Target provider and service (e.g. `AWS CloudFormation`, `Cloudflare Pages`).
   - Required capability (e.g. `stack_status_read`, `pages_deploy`).
   - Official integration reference for the consumer host.
   - Minimum IAM permissions needed for initial discovery.
   - Read-only connection verification command for the user to execute locally.
4. **Permit Offline Review**: If the task includes document review, architecture analysis, or configuration linting, proceed with analysis while noting the explicit evidence limit (`offline_only: live verification omitted`).
