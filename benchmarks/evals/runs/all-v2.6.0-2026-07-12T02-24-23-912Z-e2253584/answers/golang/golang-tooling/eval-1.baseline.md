Set up `golangci-lint` by installing it, adding a config file, and wiring it into local dev and CI.

Install:

```bash
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

Run it:

```bash
golangci-lint run
```

Example `.golangci.yml`:

```yaml
run:
  timeout: 5m

linters:
  enable:
    - govet
    - errcheck
    - staticcheck
    - ineffassign
    - unused
    - gosimple
    - gofmt
    - goimports
```

Recommended baseline linters:

- `govet` for suspicious constructs
- `errcheck` for unchecked errors
- `staticcheck` for correctness and code quality
- `ineffassign` for useless assignments
- `unused` for dead code
- `gosimple` for simpler idiomatic code
- `gofmt` for formatting
- `goimports` for formatting plus import cleanup

If you want stricter enforcement, you can also add:

- `revive` for style
- `gocritic` for deeper lint checks
- `misspell` for typos

For most projects, start with the baseline set above, get the codebase clean, then add stricter linters gradually to avoid overwhelming noise.

