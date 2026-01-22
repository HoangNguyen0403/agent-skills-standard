---
name: Configuration
description: Standards for application configuration using environment variables and libraries.
metadata:
  labels: [golang, config, env, viper]
  triggers:
    files: ['configs/**', 'cmd/**']
    keywords: [configuration, env var, viper, koanf]
---

# Golang Configuration Standards

## **Priority: P1 (STANDARD)**

## Principles

- **12-Factor App**: Store config in environment variables.
- **Typed Config**: Load config into a struct, validate it immediately.
- **Secrets**: Never commit secrets. Use env vars or secret managers.
- **No Globals**: Return a Config struct and inject it.

## Libraries

- **Standard Lib**: `os.Getenv` for simple apps.
- **Viper**: Industry standard for complex configs (supports env, config files, remote config).
- **Koanf**: Lighter, cleaner alternative to Viper.
- **Caarlos0/env**: Good for strict struct tagging.

## Pattern

1. Define `Config` struct.
2. Load from defaults.
3. Override from file (optional).
4. Override from Env (priority).
5. Validate.

## References

- [Config Pattern](references/config-patterns.md)
