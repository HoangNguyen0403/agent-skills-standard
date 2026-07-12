Keep secrets outside the application artifact and image. Inject them at runtime through Kubernetes Secrets, a managed secret store such as Vault, or environment variables; `spring.config.import` can integrate an external configuration source. Reference values from configuration instead of committing them:

```yaml
datasource:
  password: ${DB_PASSWORD}
```

Do not put credentials in `application-prod.yml`, Dockerfiles, Docker build arguments, Git history, or image layers. Restrict Secret access with the workload's identity and RBAC, rotate values without rebuilding the application, and avoid logging configuration values or exception details that contain them. Use profile files for non-secret environment differences and select the profile with `SPRING_PROFILES_ACTIVE`.

Bind grouped settings through validated `@ConfigurationProperties` records so missing required values fail fast at startup. Scan the repository and container layers for accidental secrets, ensure generated logs and actuator output are safe, and test that the deployment can start with real secret injection. A secret reference is not protection by itself: also enforce least privilege, TLS, rotation, and access auditing in the platform.


