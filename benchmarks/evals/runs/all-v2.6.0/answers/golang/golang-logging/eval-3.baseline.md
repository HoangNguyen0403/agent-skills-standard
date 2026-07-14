Use `WARN` or `INFO` for expected application errors like `user not found`, depending on whether it’s part of normal control flow:

- `INFO` if it’s common and expected (for example, lookup misses during login or search)
- `WARN` if it’s unusual and worth noticing, but still handled safely

Use `ERROR` for unexpected failures that break the current operation.

Use `FATAL` only if the process cannot continue and will exit.

For panics, don’t treat them like normal business errors:

- log the recovered panic as `ERROR` or `FATAL`
- include stack trace and context
- fix the code path so panics stay exceptional

In short:

- `user not found` → usually `INFO` or `WARN`
- unexpected panic → `ERROR` or `FATAL`, with stack trace

