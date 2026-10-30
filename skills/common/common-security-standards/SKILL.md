---
name: common-security-standards
description: Enforce universal security protocols for safe, resilient software. Use when implementing authentication, encryption, authorization, input validation, secret management, or any security-sensitive feature across any language or framework.
metadata:
  triggers:
    files:
    - '**/*.ts'
    - '**/*.tsx'
    - '**/*.go'
    - '**/*.dart'
    - '**/*.java'
    - '**/*.kt'
    - '**/*.swift'
    - '**/*.py'
    keywords:
    - security
    - encrypt
    - authenticate
    - authorize
---
# Security Standards

## **Priority: P0 (CRITICAL)**

## Always-Apply Rules

Apply these on **every code write**, regardless of context:

- **No hardcoded secrets**: Use environment variables or secret managers. Never commit keys, passwords, or tokens to source control.
- **No raw SQL strings**: Use parameterized queries or ORMs — `WHERE id = ${userId}` always wrong.
- **No stacktraces in prod**: Return generic error codes; log full detail server-side only.

## Workflow

Activate when: implementing auth, encryption, authorization, input handling, or any security-sensitive feature.

1. **Identify trust boundaries** — map every data entry point (API, UI, CSV, webhook).
2. **Validate and sanitize** all external input at each boundary.
3. **Apply least privilege** to users, services, and containers.
4. **Verify** with SAST/DAST scanners in CI before merge.

## Context-Specific Rules

### Data Safeguarding

- **Zero Trust**: Never trust external input. Sanitize and validate every data boundary.
- **Least Privilege**: Grant minimum necessary permissions to users, services, and containers.
- **Encryption**: AES-256 for data-at-rest; TLS 1.3 for data-in-transit.
- **PII Logging**: Never log PII (email, phone, names). Mask sensitive fields before logging.

See [implementation examples](references/implementation.md) for parameterized queries and secret management.

### Trust Boundaries & Authority Lifecycle

- **Privileged Capability Minting**: Do not scope ordinary user sessions to a single operation; ordinary sessions follow their own audience, expiry, revocation, and current-authorization policy. Strictly scope privileged mint, seal, restore, or high-risk mutation capabilities to operation-private issuers and single-operation lifetimes. Expose no exported or sibling mint gateway that accepts caller-supplied identity, context, or keys. Never reuse a privileged capability across sibling operations or unrelated processes.
- **Independently Protected Authority**: Keep authority verifiers independent from untrusted client ledgers. Reject cached or stale local authority states; re-verify against the authoritative source. An authorized backup restore still requires post-restore revalidation against current authority.
- **Authenticated Persisted Evidence**: Persist audit records and security artifacts with authentic caller provenance and integrity controls appropriate to the threat model (protected append-only storage, or a verified MAC/signature only where evidence crosses an untrusted boundary). Derive caller principal and operation claims from the operation's resolved authenticated context, never from caller-supplied event fields.
- **Transaction-Time Revalidation**: Re-check authorization, tenancy, enrollment, and permissions inside the writer transaction after acquiring the shared authority-revision lock that every membership, session, enrollment, and ownership change must take and bump. Reject when the locked revision differs from the capability's; never rely on initial connect checks or pre-transaction snapshots.
- **Alternate Public APIs & Parity**: Ensure security controls and rate limits apply identically to alternate public entrypoints, internal aliases, batch routes, and legacy API versions.
- **Multi-Connection & Concurrency Races**: Guard against races across parallel connections or multi-process requests with a shared authority-revision lock that revocation paths also take, atomic conditional updates, and single-use operation-identity consumption. Account-only row locks neither cover concurrent revocation nor reject a replayed operation.
- **Lifecycle Rejection**: Explicitly reject stale ledgers and stale restores, sibling or public capability mints, direct bypass APIs, and cross-enrollment credential retention. Preserved legitimate exceptions: one-time root bootstrap, monotonic gap recovery, authenticated unexpired session resume, and explicit root-authorized backup restore followed by revalidation.

- **Injection Prevention**: Use parameterized queries or ORMs to stop SQL, Command, and XSS injections.
- **Dependency Management**: Regularly scan (`npm audit`, `pip audit`) and update third-party libraries to patch CVEs.
- **Secure Auth**: Implement Multi-Factor Authentication (MFA) and secure session management.
- **Error Privacy**: Never leak stack traces or internal implementation details to end-user.

### Continuous Security

- **Shift Left**: Integrate security scanners (SAST/DAST) early in CI/CD pipeline.
- **Data Minimization**: Collect and store only minimum data required for business logic.
- **Audit Logging**: Maintain logs for sensitive operations (Auth, Deletion, Admin changes).

## Anti-Patterns

- **No default passwords**: Force rotation on first use with strong entropy requirements.

## References

- [Injection Testing Protocols (SQLi/HTMLi)](references/INJECTION_TESTING.md)
- [Vulnerability Remediation & Secure Patterns](references/VULNERABILITY_REMEDIATION.md)

## Remediation anchors

- Remediation anchors: Argon2id, parameterized queries or ORM, rate limiting, HttpOnly Secure cookies
