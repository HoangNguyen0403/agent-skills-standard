Usually no. Ignoring an error with `_` is only acceptable when you are completely sure the error is impossible or explicitly irrelevant, and that choice is obvious to future readers.

In practice, most ignored errors are bugs waiting to happen. If you truly want to discard one, prefer making that intent explicit, for example by checking and documenting why it is safe.

Bad:

```go
result, _ := strconv.Atoi("123")
```

Better:

```go
result, err := strconv.Atoi("123")
if err != nil {
    return fmt.Errorf("parse input: %w", err)
}
```

If you intentionally ignore an error, leave a comment explaining why.

