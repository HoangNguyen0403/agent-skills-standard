Two fast, evidence-based next steps:

1. Stop changing code and capture a controlled comparison. Save the current diff, reproduce the bug with the smallest input, collect the full stack trace and relevant logs, and compare the failing revision with the last known-good commit, configuration, dependency lockfile, deployed artifact, and data. If a deterministic test can classify a revision as good or bad, run `git bisect`.

2. Trace the first incorrect value across the failing path. Add temporary, structured diagnostics at subsystem boundaries—inputs, outputs, IDs, state transitions, and external responses—without logging secrets. Form one hypothesis from that evidence, add a focused regression test, make one narrow change, and run the focused plus integration tests. If production is impacted, use rollback or a feature-flagged mitigation while preserving the investigation data.

Do not choose ideas because they are different; choose them because they test a specific hypothesis. Record each experiment and its result so failed attempts are not repeated and the eventual fix explains the observed failure.
