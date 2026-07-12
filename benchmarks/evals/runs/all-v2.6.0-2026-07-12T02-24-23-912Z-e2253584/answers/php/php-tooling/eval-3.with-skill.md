Commit composer.lock for an application so deployments and CI install the reviewed, reproducible dependency graph. Run composer install in CI rather than an unconstrained composer update, use composer audit, and review lockfile diffs before committing them. Do not commit vendor/.

