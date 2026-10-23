# Task 8 correction report

- **Scope:** `scripts/generate-indices.ts` outer rejection handler only.
- **Change:** Replaced `generate().catch(console.error)` with a typed rejection callback that logs the original error and sets `process.exitCode = 1`. This preserves stderr observability and allows pending output to drain; it does not call `process.exit`.
- **Preserved:** Existing guard, generation flow, and inner error handling are unchanged.
- **Verification:** No checks, tests, builds, formatters, or generator runs, per the assigned brief. The parent-reported foreign-CWD scenario previously showed an unchanged workspace but exit code 0; the fix addresses the entrypoint behavior responsible for that status. Parent should run foreign-CWD, normal-generation, and wrapper-parity scenarios.
- **Risk:** Runtime behavior remains unverified in this slice; require parent integration verification before claiming acceptance.
