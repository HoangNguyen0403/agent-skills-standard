# Effective Go Summary

## Formatting

- `gofmt` is the authority. No arguments.

## Commentary

- Comments immediately precede the declaration.
- `// Package foo implements...` for package docs.
- Exported names **must** have comments.

## Names

- Getters: `Owner()`, not `GetOwner()`.
- Setters: `SetOwner()`.
- Interfaces: One method -> `Listener`, `Reader`.

## Control Structures

- No parentheses `if x > 0 {`.
- Initialization in if: `if err := file.Chmod(0664); err != nil {`.
- `switch` handles multiple cases: `case ' ', '?', '&':`.

## Allocation

- `new(T)`: Allocates zeroed storage for `T`, returns `*T`.
- `make(T, args)`: Creates slices, maps, channels. Returns initialized `T` (not `*T`).
