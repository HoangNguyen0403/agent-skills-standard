To get real-time Go diagnostics and type errors in Claude Code, use `gopls` through the IDE diagnostics integration.

1. Install `gopls`:

```bash
go install golang.org/x/tools/gopls@latest
```

2. Make sure your Claude Code environment has the `gopls`-backed IDE diagnostics integration available.

3. Use `mcp__ide__getDiagnostics` to surface real-time errors, type issues, and warnings from `gopls`.

Recommended Go tooling workflow after edits:

- `mcp__ide__getDiagnostics`
- `go vet ./...`
- `goimports -w .`
- `golangci-lint run ./...` if the repo uses `.golangci.yml`

Notes:

- Prefer `goimports` over `gofmt` alone, because it formats and fixes imports.
- `go vet` catches correctness issues that formatting will not.
- `golangci-lint` is useful for broader lint coverage, but `gopls` is what gives you the live diagnostics experience.

