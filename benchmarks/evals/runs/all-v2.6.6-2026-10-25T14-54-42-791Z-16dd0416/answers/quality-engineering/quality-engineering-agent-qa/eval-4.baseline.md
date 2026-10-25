Do not mark the registry `HEALED`. An exit code of 0 and a native “healed” verdict are insufficient when the assertion was changed to make the run green; this may mask a regression or weaken coverage.

Record it as `HEALED_PENDING_VALIDATION` (or equivalent) and defer signoff. Required evidence:

- The original failing assertion and failure output.
- A reviewed diff proving the new assertion matches the intended behavior rather than relaxing the check.
- Traceability to the requirement or bug fix.
- An independent rerun, or documented equivalent validation, showing the intended behavior passes and relevant negative cases still fail.
- Reviewer approval and confirmation that no tests were skipped, suppressed, or made less strict.

Release urgency can justify tracking the exception, but not claiming registry-healed status without that evidence.
