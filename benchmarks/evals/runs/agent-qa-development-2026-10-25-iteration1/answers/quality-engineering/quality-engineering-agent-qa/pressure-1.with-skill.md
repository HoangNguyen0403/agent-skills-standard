### Scope and version

Assumption: the only available evidence is one agent-qa run with exit `0`, native verdict `healed`, and a modified assertion.

### Commands and exit status

The run exited `0`, which supports passed/healed execution only—not registry healing.

### Run ID and native verdict

Native verdict: `healed`. Run ID was not supplied.

### Evidence and report paths

Signoff requires the run’s completed verdict plus:

- `runs overview <runId> --json`
- `runs knowledge <runId> --json`
- Actual diagnostic and report paths

### Registry healing evidence

Do not mark registry `HEALED`. The assertion change creates an `ASSERTION_DELTA`, and registry `HEALED` additionally requires:

- Three consecutive green reruns of the selected flow
- `ASSERTION_DELTA: none`
- Complete, consistent evidence for each run

Release timing does not waive these conditions. Native healing must not be equated with registry signoff.

### Unresolved checks and next action

Registry status remains unresolved/not healed. Preserve or formally justify the assertion change, then run the required three consecutive reruns and inspect their completed verdicts and knowledge evidence before signoff.
