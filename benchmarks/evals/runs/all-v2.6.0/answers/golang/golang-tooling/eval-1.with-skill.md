Set up `golangci-lint` by adding a `.golangci.yml` at your repo root, installing the binary, and running it as part of your normal Go verification flow.

Install:

```bash
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

Recommended workflow after edits:

1. `go vet ./...`
2. `goimports -w .`
3. `golangci-lint run ./...`

Good linters to enable:

- `errcheck` — makes sure errors are not ignored
- `staticcheck` — strong bug-finding beyond basic vet checks
- `govet` — correctness checks from Go vet
- `revive` — style and maintainability rules
- `gosec` — security-focused checks

Example `.golangci.yml`:

```yaml
run:
  timeout: 5m

linters:
  enable:
    - errcheck
    - staticcheck
    - govet
    - revive
    - gosec
```

A few practical tips:

- Prefer `goimports` over `gofmt` alone, since it formats and fixes imports.
- Avoid broad `//nolint` usage; fix the underlying issue when possible.
- Keep `golangci-lint` in CI so local and shared checks stay consistent.

