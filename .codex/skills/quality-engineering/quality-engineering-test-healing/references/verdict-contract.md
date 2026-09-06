# Verdict Contract

- `HEALED`: repair applied, 3 consecutive sequential foreground reruns pass,
  `ASSERTION_DELTA: none` (assertion count and matcher strength unchanged).
- `REAL_BUG_DO_NOT_HEAL`: evidence shows an intentional or unintentional
  product behavior change; hand off to `dev-fix` with the failure evidence.
- `QUARANTINE_CANDIDATE`: fails intermittently across isolated reruns with no
  code change between runs; hand off to `quality-engineering-flaky-triage`
  with a ticket, not left green-by-retry.
- `BLOCKED`: no trace/screenshot/log artifact available to classify from.
