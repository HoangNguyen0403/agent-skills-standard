Treat the API key as compromised immediately.

1. Revoke or rotate the key with the provider, and update the application to use the replacement through secure secret management. Do not leave the old key active while investigating.
2. Remove the key from the working tree and prevent recurrence with `.gitignore`, secret scanning, and appropriate pre-commit hooks such as Husky or Lefthook. Do not merely delete it in a new commit: the key remains in Git history.
3. Purge the key from all affected history using a history-rewriting tool such as `git filter-repo`, then force-push the rewritten branch only through the repository's approved coordination process. Coordinate with every collaborator because existing clones and branches may still contain the secret and need to be refreshed or recloned.
4. Audit logs, CI artifacts, caches, forks, and deployment systems for exposure, and notify the security owner according to the incident process.

The accidental commit to `main` should not be followed by another direct push. Use the repository's emergency remediation procedure or a pull request where feasible, document the incident, and verify that the replacement credential works while the revoked credential no longer does. Never commit the replacement key, `.env` files, certificates, or other credentials.
