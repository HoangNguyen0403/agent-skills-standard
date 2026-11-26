---
name: golang-error-handling
description: Standards for error wrapping, checking, aggregation, and definition in Golang. Use when wrapping errors, defining sentinel errors, or handling errors idiomatically in Go.
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

- **Errors Are Values**: Handle them like any other value.
- **Wrap Deliberately**: Wrapping exposes identity to callers. Add only the context a caller or operator needs; preserve identity with `%w` when callers must match, and translate at the boundary when internals must stay hidden. `%v` keeps the message but drops the chain; it does **not** redact.
- **Handle Once**: Log or return; never log the same failure at two layers. The logging owner is the boundary that handles or translates the request/job (see logging skill).
- **Propagate or Translate**: `return err` is valid when the caller contract already carries context or identity. Translate to a domain error at the boundary when DB/implementation detail must not leak; verify client-safe text separately.
- **Match the Tree**: `errors.Is` for sentinels, `errors.As` for types. Ordinary `err != nil` success checks remain correct. `errors.Is`/`errors.As`/`%w` require Go 1.13+.
- **Aggregate Independent Errors**: Go 1.20+ `errors.Join` collects errors; it is not a response schema or a concurrency primitive.
- **Use Standard Lib**: The `errors` package is sufficient. Avoid `pkg/errors` (archived).

## Guidelines

- **Sentinel Errors**: Exported, fixed errors (`io.EOF`, `sql.ErrNoRows`). Use `errors.Is(err, io.EOF)`, not `==` or strings.
- **Error Types**: Structs implementing `error`. Extract with `errors.As(err, &target)`; `As` returns the first match, not every validation failure.
- **Optional Generic Extraction**: Go 1.26+ adds the generic `errors.AsType`; keep `errors.As` below 1.26 or where code must compile on older toolchains. See [reference](references/error-wrapping.md).
- **Cancellation**: Preserve `context.Canceled`/`context.DeadlineExceeded` so callers can classify them; translate only at the boundary that owns the client response.
- **Join Semantics**: `errors.Join` discards nil entries and returns nil for empty/all-nil input; the result unwraps via `Unwrap() []error`, so `errors.Is`/`errors.As` traverse joined children. `errors.Unwrap` alone does not reach them.
- **Typed Nil**: A typed nil pointer stored in an `error` interface is not nil. Return `nil` explicitly instead of a typed-nil error value.
- **Panic**: Only for unrecoverable startup errors.

## Anti-Patterns

- **No meaningless wrapping**: Avoid `fmt.Errorf("failed: %w", err)` when it adds no context; do not wrap an error whose exact identity is the caller contract.
- **No universal equality ban**: `err != nil` is correct; use `errors.Is` for sentinel identity across a chain.
- **No string error checks**: String comparison is brittle; use `errors.Is`/`errors.As`.
- **No swallowed errors**: Do not discard an error that matters. A deliberate best-effort discard needs a comment saying why.
- **No internal leakage**: Never expose SQL, stack traces, or secret-bearing error text to clients.

## References

- [Wrapping, Join and Matching](references/error-wrapping.md)