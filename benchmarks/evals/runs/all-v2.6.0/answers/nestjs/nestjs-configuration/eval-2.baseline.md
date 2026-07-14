Update every configuration boundary that owns the variable: the local `.env`/example file, deployment manifests or secret store, CI/CD environment, and the Nest configuration validation schema. If the application maps configuration into a typed namespace, add the key and type there too.

Use the variable via `ConfigService` and update tests, docs, and startup/health checks that depend on the configuration. Restart the process or redeploy; environment variables are normally read at startup. Verify precedence between shell variables, `.env`, and environment-specific files, and ensure the new value is present in the actual runtime container or pod. Do not commit real secrets or assume changing a local `.env` changes an already running deployment.

