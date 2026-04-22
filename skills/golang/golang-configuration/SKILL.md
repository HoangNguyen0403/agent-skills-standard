---
name: golang-configuration
description: Load and validate application configuration from environment variables and config files. Use when managing Go application config with environment variables or viper.
metadata:
  triggers:
    files:
    - 'configs/**'
    - 'cmd/**'
    keywords:
    - configuration
    - env var
    - viper
    - koanf
---
# Golang Configuration

## **Priority: P1 (STANDARD)**

## Principles

- **12-Factor App**: Store config in environment variables.
- **Typed Config**: Load config into struct, validate immediately.
- **Secrets**: Never commit secrets. Use env vars or secret managers.
- **No Globals**: Return Config struct and inject it.

## Implementation Workflow

1. **Define Config struct** — Create typed struct with all required fields.
2. **Load defaults** — Set sensible defaults for non-secret values.
3. **Override from file** — Optionally load from YAML/JSON config file.
4. **Override from env** — Environment variables take highest priority.
5. **Validate at startup** — Crash immediately on missing required config.
6. **Inject via constructor** — Pass Config to services; never use global config vars.

See [config struct and usage examples](references/config-patterns.md)

## Libraries

- **Standard Lib**: `os.Getenv` for simple apps.
- **Viper**: Industry standard for complex configs (env, files, remote).
- **Koanf**: Lighter, cleaner alternative to Viper.
- **Caarlos0/env**: Strict struct tagging approach.

## Anti-Patterns

- **No hardcoded secrets**: load all secrets from env vars or secret manager.
- **No global config vars**: return typed Config struct and inject via constructors.
- **No silent startup**: crash immediately on missing required env vars.

## References

- [Config Pattern](references/config-patterns.md)