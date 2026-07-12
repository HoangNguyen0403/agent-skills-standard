Stop random edits. They destroy causal information and make it unclear which change helped or whether the bug was merely masked.

Reset the debugging process without reverting other people’s work: record the symptom, exact reproduction steps, expected versus actual behavior, environment, and current diff. Preserve the state in a branch or patch if needed. Then:

1. Observe the complete error/stack trace, relevant logs, inputs, timing, recent changes, and dependency/configuration versions.
2. Build the smallest deterministic reproduction. If it is not deterministic, capture the conditions that correlate with failure and add targeted, structured instrumentation.
3. State one falsifiable hypothesis, such as “the callback runs after the resource is closed,” rather than listing many guesses.
4. Run one controlled experiment that changes only the suspected condition. If the result does not support the hypothesis, discard it and return to the evidence; do not immediately start fix number four.
5. After the cause is proven, make the smallest root-cause fix. Avoid broad null checks, swallowed exceptions, retries, or debug prints that hide the invariant violation.
6. Re-run the minimal reproduction and relevant regression, boundary, concurrency, and failure-path tests. Review the diff and verify the original symptom is gone without introducing a new silent failure.

A useful incident note is: observed facts, reproduction, hypothesis, experiment/result, root cause, fix, and verification evidence. If you share the error, stack trace, repro, recent diff, and environment, the next step can be narrowed from evidence rather than another guess.
