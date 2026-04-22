---
name: golang-language
description: Core idioms, style guides, and best practices for writing idiomatic Go code. Use when writing Go code following official style guides and idiomatic patterns.
metadata:
  triggers:
    files:
    - 'go.mod'
    keywords:
    - golang
    - go code
    - idiomatic
    - gofmt
    - goimports
    - iota
    - golang style
---
# Golang Language Standards

## **Priority: P0 (CRITICAL)**

## Guidelines

- **Formatting**: Run **`gofmt`** or **`goimports`** on save. Use **`gopls`** for LSP features.
- **Naming**: Use **`camelCase`** for internal (unexported) and **`PascalCase`** for public (exported) symbols.
- **Packages**: Use short, lowercase, singular names (e.g., **`http`**, **`user`**). Avoid `_` or `camelCase` in package names.
- **Interfaces**: Small interfaces — 1-2 methods max. Define where used (consumer side), not where implemented.
- **Errors**: Return **`error`** as last return value. Handle errors **immediately** at call-site.
- **Slices**: Use **`make(slice, len, cap)`** to pre-allocate capacity and avoid redundant re-allocations.
- **Enums**: Use const block with iota for type-safe enumerations.
- **Zero Values**: Leverage **`zero-value`** initialization over explicit `nil` checks where possible.

## Anti-Patterns

- **No init**: Use constructors (NewService()), not init(). (not init() — it runs implicitly and makes testing harder)
- **No Globals**: Use DI, not global mutable state.
- **No `panic`**: Return errors, don't panic.
- **No `_` ignored errors**: Always check and handle errors.
- **No stutter**: `log.Error`, not `log.LogError`.

## Verification Workflow (Mandatory)

After writing or modifying Go code:

1. **`mcp__ide__getDiagnostics`** — catch compile errors and gopls type diagnostics immediately
2. **`go vet ./...`** — catch common mistakes (printf mismatches, unreachable code, shadowed vars)
3. **`goimports -w .`** — fix imports and formatting in one pass

## References

- [Idioms](references/idioms.md)
- [Effective Go Summary](references/effective-go-summary.md)