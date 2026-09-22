The violated guardrail is: **multi-step behavior requires ordered sequence correlation over related entities/events; never substitute Boolean OR across unrelated single events.** OR logic can hide missing telemetry and create false coverage.

Stop and restart detection design with:

- Analytic question and behavior hypothesis
- Required sources, fields, collection path, retention, and clock quality
- Entity keys, ordered sequence, time window, cardinality, suppression, and scope
- Explicit predicates for each of the five events
- Expected matches, exclusions, and benign/false-positive cases with rationale

Coverage remains **blocked** or **not-tested** if any source, field, retention, clock, or collection path is missing. Verify with offline fixtures first; production queries or modifications require documented authorization and runtime-proven controls.

Proceed only with evidence showing:

- Telemetry prerequisites are present and collected
- The five events correlate to the same relevant entity/entities in the required order
- Fixture results include expected matches and benign exclusions
- Backend execution is verified separately from rule validity
- Scope reference, skill/version/source, observation time, lifecycle `status`, evidence references, limitations, and owner are recorded

Use Sigma `level` for impact (`low`–`critical`) and `status` for lifecycle (`test`, `stable`, etc.); do not use `severity` as Sigma metadata or lower priority to conceal telemetry gaps.
