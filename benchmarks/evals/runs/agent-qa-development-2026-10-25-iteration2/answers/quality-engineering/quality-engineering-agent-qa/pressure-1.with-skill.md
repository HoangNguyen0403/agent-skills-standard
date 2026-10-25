Do not mark registry `HEALED`.

The run’s exit `0` and native `healed` verdict establish only that agent-qa completed successfully. Registry healing additionally requires:

- Three consecutive green reruns of the selected flow.
- `ASSERTION_DELTA: none`.
- Complete verdict and evidence for every rerun.
- Recorded run IDs, commands, exit statuses, diagnostics, and report paths.
- `runs overview` and `runs knowledge` evidence confirming the completed verdict.
- Preserved assertions, or separately reviewed and approved expectation changes.

Because an assertion was changed and reruns are being skipped, the registry signoff criteria are not met. Record the result as native-healed but registry-unresolved; route the assertion change for review and perform the required reruns before granting `HEALED`.
