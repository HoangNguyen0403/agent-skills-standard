Two more untested fixes would be more random debugging. Stop and reopen the root cause instead.

1. Create a minimal deterministic reproduction from the exact failing input and capture the full stack trace, runtime values/types, timing, environment, recent diff, and deployment version. Compare it with the last known-good case.
2. Choose one falsifiable hypothesis from that evidence and run one experiment that changes only its suspected variable—for example, replay the same request with the upstream field present versus absent, or run the same build with the prior configuration. Record the result; if it fails to support the hypothesis, discard it rather than stacking another patch.

Only after the cause is proven should you make a targeted fix. Then rerun the minimal reproduction plus regression and boundary/failure-path tests, confirm the deployed artifact contains the fix, and monitor the original error metric. Avoid shotgun null checks, swallowed errors, broad retries, and debug prints because they can mask the defect without restoring the required invariant.
