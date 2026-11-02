# Authorization & Host Enforcement

## Five Distinct Security Gates

In cloud DevOps operations, these five concepts are distinct facts. Establishing one never implies any other:

| Gate | Meaning | Validation Source | Failure Consequence |
| --- | --- | --- | --- |
| **1. Identity** | Who or what is acting | Provider STS / token identity query | Block: cannot establish caller |
| **2. Permission** | IAM policy grants on provider | Provider IAM simulator / effective policy | Block: missing cloud permission |
| **3. Authority** | Organization policy permitting action | Repo policy, change ticket, security tier | Block: organizational policy violation |
| **4. Approval** | Human authorization for concrete action | Signed/recorded human grant with expiry | Block: unapproved action |
| **5. Enforcement** | Host/runtime barrier blocking writes | Guardrail hook, MCP tool sandbox | Block: unsupported enforcement |

Prompt assertions or persona names (e.g. "Security Reviewer") do not establish credential isolation or separate authority.

## Bound Scope Specification

Every production or mutating operational grant must be explicitly bound to:

- **Classified Operation & Effect**: Specific operational mode (`setup`, `deploy`, `verify`, `monitor`, `diagnose`, `recover`) and its classified effect (read-only, configuration mutation, or deploy-bearing).
- **Authenticated Principal**: Attributable caller ID, ARN, or service account.
- **Target Boundary**: Provider, service, organization/account, project/resource, region (if applicable), and environment (e.g. `staging`, `production`).
- **Exact Action Set**: Specific API actions to execute (e.g. `ecs:UpdateService`, `cf:uploadPages`).
- **Artifact & Configuration Identity**: Immutable commit SHA, container digest (`sha256:...`), or config hash.
- **Time Expiry**: Explicit UTC expiration timestamp after which the grant is void.

### Initial Queries & Unresolved Identity

- Initial read-only identity or configuration queries itself require bounded authorized read scope.
- If caller identity cannot be resolved from provider context, all live operations are immediately blocked (`outcome: unauthenticated`).

## Invalidation & Pre-Dispatch Rechecks

Approval is not a durable license. Run fresh pre-dispatch checks immediately before every mutation:

- Recheck principal continuity, target scope, provider permission, current expiry timestamp, and active revocation status immediately prior to executing EACH mutating call.
- Any change to requested operational mode (e.g. switching from `verify` or `setup` to `deploy`), target environment, action set, or artifact identity immediately invalidates affected grants.
- Expired timestamps, revoked tickets, or scope changes require renewed human authorization.

## Host Enforcement Evidence Checklist

Before executing any production mutation, verify and retain evidence of these six enforcement properties:

1. **Effective Scope**: Documented, minimum-action/resource scope allowed by provider policy.
2. **Named Approver & Expiry**: Attributable human identifier and unexpired ISO timestamp.
3. **Principal Continuity**: Authenticated identity matches the approved principal without session escalation.
4. **Enforced Scope Boundary**: Host-level control (guardrail hook or capability gate) active to prevent out-of-scope mutations.
5. **Revocation & Cancellation**: Operational path to cancel in-flight executions or handle revoked approvals immediately.
6. **Audit Destination**: Explicit log destination, ticket, or audit sink recording the action receipt.

If host controls cannot enforce boundaries or verify revocation, record `outcome: unsupported_enforcement` and halt.

## Denial Handling & Least Privilege

When an operation is rejected or denied:

- Report the exact reason code: `permission_denied`, `approval_required`, `approval_expired`, or `unsupported_enforcement`.
- Formulate an administrator review request containing only the minimum missing action/resource scope.
- Never request blanket `Owner`, `AdministratorAccess`, or `Editor` roles to resolve permission errors.
- Never modify security group rules, bucket ACLs, or IAM policies to make resources publicly accessible to circumvent errors.
