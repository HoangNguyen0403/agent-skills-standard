---
name: Error Handling
description: Standards for error wrapping, checking, and definition in Golang.
metadata:
  labels: [golang, error-handling, errors]
  triggers:
    files: ['**/*.go']
    keywords: [error, fmt.errorf, errors.is, errors.as]
---

# Golang Error Handling Standards

## **Priority: P0 (CRITICAL)**

## Principles

- **Errors are Values**: Handle them like any other value.
- **Handle Once**: Log OR Return. Never Log AND Return (creates duplicate logs).
- **Add Context**: Don't just return `err` bubble up. Wrap it with context: `fmt.Errorf("failed to open file: %w", err)`.
- **Use Standard Lib**: Go 1.13+ `errors` package (`Is`, `As`, `Unwrap`) is sufficient. Avoid `pkg/errors` (deprecated).

## Guidelines

- **Sentinel Errors**: Expoted, fixed errors (`io.EOF`, `sql.ErrNoRows`). Use `errors.Is(err, io.EOF)`.
- **Error Types**: Structs implementing `error`. Use `errors.As(err, &target)`.
- **Panic**: Only for unrecoverable startup errors.

## Anti-Patterns

- **Check only not nil**: `if err != nil { return err }` -> Loses stack/context context.
- **String checking**: `err.Error() == "foo"` -> Brittle.
- **Swallowing errors**: `_ = func()` -> Dangerous.

## References

- [Error Wrapping Patterns](references/error-wrapping.md)
