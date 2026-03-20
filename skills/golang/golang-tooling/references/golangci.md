# golangci-lint Configuration Example

```yaml
# .golangci.yml
run:
  timeout: 5m
  modules-download-mode: readonly

linters:
  enable:
    - errcheck
    - staticcheck
    - govet
    - revive
    - gosec
    - goimports
    - unused

linters-settings:
  govet:
    check-shadowing: true
  errcheck:
    check-type-assertions: true
  gosec:
    excludes:
      - G104  # unhandled errors in defer (handled by errcheck)

issues:
  exclude-rules:
    - path: _test\.go
      linters:
        - errcheck
```
