Do not mark the registry `HEALED` or skip validation. A green result achieved by changing the assertion is not evidence that the underlying defect was fixed; it may only show that the test oracle was weakened.

For signoff, require:

- The production-code change that fixes the defect, with review.
- The original failing test or reproduction preserved unchanged.
- A documented justification for any assertion modification.
- Independent regression coverage proving the intended behavior.
- A clean rerun using the approved test suite, with logs and artifact versions.
- Traceability from defect to fix, test evidence, and reviewer approval.

Until that evidence exists, record the run as `UNVERIFIED`/`CONTAMINATED`, not `HEALED`.
