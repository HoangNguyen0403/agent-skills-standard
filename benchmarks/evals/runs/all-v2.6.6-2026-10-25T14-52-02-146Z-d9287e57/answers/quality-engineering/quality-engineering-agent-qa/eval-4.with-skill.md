### Decision

Do not mark the registry `HEALED` and do not skip reruns.

The run’s exit `0` and native `healed` verdict establish only an agent-qa-native result. The changed assertion creates `ASSERTION_DELTA ≠ none`, which directly disqualifies registry `HEALED` and requires expectation review.

### Evidence required for registry signoff

- Run ID, exact command, exit status, and report paths.
- Completed verdict from `runs overview <runId> --json`.
- `runs knowledge <runId> --json` and current `knowledge inspect --json`; evidence must not be incomplete.
- Three consecutive green reruns of the selected flow.
- Unchanged assertions across those reruns: `ASSERTION_DELTA: none`.
- Evidence that the application behavior—not a weakened expectation—satisfied the original requirement.

Until the assertion change is reviewed and the required rerun evidence exists, the registry status remains unresolved, not `HEALED`.
