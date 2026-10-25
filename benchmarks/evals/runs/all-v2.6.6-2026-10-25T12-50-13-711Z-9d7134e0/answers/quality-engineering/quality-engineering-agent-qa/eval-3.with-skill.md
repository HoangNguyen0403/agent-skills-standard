### Run ID and native verdict

Run `r-42` is unresolved. An empty failed-run list does not establish success; the overview has no completed verdict, and knowledge reports `evidence-incomplete`.

### Evidence still needed

- Completed native verdict
- Diagnostic and actual report paths
- Current memidex records via `knowledge inspect --json`
- Sufficient execution evidence to distinguish application, expectation, or environment failure

Registry healing is not established; it would additionally require three consecutive green reruns with `ASSERTION_DELTA: none`.
