Use `gopls` via your editor integration.

Typical setup:

- Install the Go language server:
  - `go install golang.org/x/tools/gopls@latest`
- Make sure your editor or Claude Code environment is using `gopls`
- Open the Go project with its `go.mod` file present

For command-line checks, also run:

- `go test ./...`
- `go vet ./...`
- `gopls check ./...`

That gives you live diagnostics, type errors, and navigation while editing.

