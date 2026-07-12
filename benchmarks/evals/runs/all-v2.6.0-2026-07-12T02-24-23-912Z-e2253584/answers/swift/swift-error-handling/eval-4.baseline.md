Use `fatalError` only when continuing is impossible and the condition represents a programmer error or an intentionally unimplemented path, such as an abstract-like base method or an impossible enum case under a proven invariant. It terminates the process, so it is not appropriate for user input, network failures, or recoverable runtime conditions.

Prefer a normal error for recoverable failures. Use `assert` for debug-only checks, and `precondition`/`preconditionFailure` when violating the condition means the program's contract is invalid in all builds. Make the message explain the violated invariant.

