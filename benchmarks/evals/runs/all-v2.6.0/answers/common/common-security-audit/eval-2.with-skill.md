# Severity of a hardcoded database password in Go source

This is a P0/critical finding. The skill assigns P0 to any hardcoded secret, and a database password can directly expose production data, enable modification or deletion, and permit lateral movement depending on the account privileges. The severity remains critical even if the file is not currently imported: it may exist in Git history, artifacts, logs, caches, or developer clones.

Immediate actions:

1. Revoke and rotate the password now. Assume it is compromised; inspect database authentication and access logs for misuse and determine whether the account has excessive privileges.
2. Remove the value from the working tree and all reachable Git history with an approved history-rewrite process, then coordinate force-updates and invalidate old clones/artifacts. Do not merely delete the current line.
3. Move runtime configuration to an environment-injected secret or a managed secret store. Do not put the replacement in a committed `.env`, binary, container layer, or client bundle.
4. Reduce the database account to least privilege, require TLS, restrict network access, and ensure rotation is operationally supported.

In the Go code, read the secret from the runtime configuration, validate that it is present without logging it, and ensure error messages and request/SQL logs cannot print the DSN or password. Add secret scanning to pre-commit/CI and test that logs redact credentials. Review nearby connection strings, test fixtures, Docker layers, CI variables, and dependency/config files for additional copies.

Until rotation, history cleanup, access-log review, and a retest are complete, block release and treat the credential as leaked. If it was only a synthetic local test password, document that evidence, but still remove the pattern and verify it cannot authenticate against any shared environment; that evidence can lower practical impact, not the initial finding classification.

