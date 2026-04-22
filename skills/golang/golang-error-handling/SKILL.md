---
name: golang-error-handling
description: Standards for error wrapping, checking, and definition in Golang. Use when wrapping errors, defining sentinel errors, or handling errors idiomatically in Go.
metadata:
  triggers:
    files:
    - 'fmt.Errorf'
    - 'errors.Is'
    - 'errors.As'
    keywords:
    - error wrapping
    - sentinel error
    - error handling
---
# Golang Error Handling Standards

## **Priority: P0 (CRITICAL)**

## Principles

- **Errors Values**: Handle them like any other value.
- **Handle Once**: Log OR Return. Never Log AND Return (creates duplicate logs).
- **Add Context**: Don't return `err` bubble up. Wrap it with context: `fmt.Errorf("failed to open file: %w", err)`.
- **Use Standard Lib**: Go 1.13+ `errors` package (`Is`, `As`, `Unwrap`) sufficient. Avoid `pkg/errors` (deprecated).

## Guidelines

- **Sentinel Errors**: Expoted, fixed errors (`io.EOF`, `sql.ErrNoRows`). Use `errors.Is(err, io.EOF)`.
- **Error Types**: Structs implementing `error`. Use `errors.As(err, &target)`.
- **Panic**: Only for unrecoverable startup errors.

## Anti-Patterns

- **No bare return err**: Wrap with `fmt.Errorf("context: %w", err)` to preserve call chain.
- **No string error checks**: Use `errors.Is`/`errors.As`; string comparison brittle.
- **No swallowed errors**: Never assign errors to `_`; always handle or propagate.

## References

- [Error Wrapping Patterns](references/error-wrapping.md)