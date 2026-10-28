# Verdict Contract

- `HEALED`: repair applied, 3 consecutive sequential foreground reruns pass,
  `ASSERTION_DELTA: none` (assertion count and matcher strength unchanged),
  and fixture/selector/data baseline integrity preserved. Unchanged assertion
  text alone does not permit weakened fixtures, looser selectors matching
  unintended elements, or relaxed state preconditions.
- `REAL_BUG_DO_NOT_HEAL`: evidence shows an intentional or unintentional
  product behavior change, regression, or exposed defect; hand off to `dev-fix`
  with the failure evidence. Never suppress a real bug by altering test preconditions.
- `QUARANTINE_CANDIDATE`: fails intermittently across isolated reruns with no
  code change between runs; hand off to `quality-engineering-flaky-triage`, which opens the ticket; never left green-by-retry.
- `BLOCKED` (no evidence artifact): no trace/screenshot/log artifact available
  to classify from.
- `BLOCKED` (no stable locator target): the ladder has no stable target for the element; hand off to `specialist-testid-inserter` with the gap named `<screen>-<element>-<role>`, then re-heal.
