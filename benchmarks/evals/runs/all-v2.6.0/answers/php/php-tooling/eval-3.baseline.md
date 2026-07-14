Commit composer.lock for applications and other deployable projects so every environment installs the same resolved dependency graph. Keep composer.json as the declared constraint source and update both files together through Composer.

Do not commit a lock file for a reusable library when the project's policy intentionally lets consumers resolve compatible dependencies, unless the project explicitly requires one. Review lockfile changes, avoid manual edits, and use composer install --no-dev --prefer-dist in production.

