A hardcoded database password is generally a high-severity secret exposure, and it can be critical if the source or built artifact is accessible to unauthorized people or the database is production-facing. Severity depends on exposure and privileges, but the presence of the credential creates a direct path to the database and often enables data theft, modification, deletion, or lateral movement. It is also likely to persist in Git history, forks, CI logs, caches, binaries, and backups even after the line is removed.

Treat the password as compromised immediately:

1. Revoke or rotate it at the database and any other system where it was reused. Prefer creating a replacement identity with least privilege, then disable the old identity after dependent services are migrated.
2. Determine exposure: inspect repository history, branches, pull requests, artifacts, logs, images, CI systems, developer machines, and access permissions. Do not paste the secret into tickets or chat.
3. Review database and network logs for unexpected authentication, reads, writes, privilege changes, exports, and connections from unusual locations. Preserve evidence and involve incident response if exposure cannot be ruled out.
4. Remove the credential from current source and build artifacts, but do not assume deletion from the latest commit is sufficient. Rewrite history only under an agreed repository procedure, coordinate clones and forks, and invalidate related tokens.
5. Move runtime configuration to a managed secret store or protected deployment secret mechanism. Load it at runtime, restrict access, avoid logging it, and add secret scanning and pre-commit/CI checks.
6. Audit the database account's privileges, network exposure, TLS requirements, rotation process, and password reuse. Add monitoring and document the incident and validation evidence.

If the password is for a local test database with no sensitive data and no path to production, impact may be medium or lower, but it remains a security defect and should be removed. If it grants production administrator access, is publicly exposed, is reused elsewhere, or is present in a public repository, escalate to critical incident handling and assess breach-notification obligations with the appropriate security/legal team. Severity should be updated after confirming actual access, privilege, data sensitivity, and exposure duration.

