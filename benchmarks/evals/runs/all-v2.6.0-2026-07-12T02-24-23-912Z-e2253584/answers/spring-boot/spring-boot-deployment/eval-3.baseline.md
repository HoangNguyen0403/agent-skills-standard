# Production secret management

Do not commit secrets to properties, Dockerfiles, images, or logs. Store them in a managed secret system such as a cloud secret manager, Vault, or Kubernetes Secrets backed by one. Inject only what the service needs through controlled config imports or mounted files; choose environment variables according to the platform threat model.

Use a separate identity and least-privilege policy per service/environment. Encrypt at rest and in transit, audit access, and rotate without rebuilding the application. Support overlap between old and new credentials when necessary. Mask values in logs and error reports, prevent actuator/config endpoints from exposing them, and scan commits and images for accidental leakage. Document ownership, rotation, and recovery.



