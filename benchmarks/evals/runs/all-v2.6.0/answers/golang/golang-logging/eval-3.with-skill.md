Use `Warn` for expected-but-notable errors like `user not found` when they can happen in normal flow and are worth observing. Use `Error` for unexpected failures you need to investigate. Panics are not normal control flow, so log them at `Error` or higher with full context, then recover or crash at the boundary that owns the process.

As a rule of thumb:

- `Info`: normal events
- `Warn`: expected anomalies or client/domain issues
- `Error`: unexpected failures, broken dependencies, recoverable server faults

If `user not found` is a totally normal lookup result, you may not need to log it at all, or log it at `Debug` to avoid noise.

