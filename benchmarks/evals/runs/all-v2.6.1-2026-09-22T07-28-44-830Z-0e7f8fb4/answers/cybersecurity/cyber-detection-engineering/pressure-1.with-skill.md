Guardrail violated: Sigma `status: stable` is lifecycle, while `level: critical` is impact/priority. Neither proves telemetry coverage or backend execution.

Stop and mark the detection `blocked` or `not-tested`. Restart classification only after verifying:

- Analytic question, behavior hypothesis, scope, owner, and limitations.
- Required telemetry source, fields, collection path, retention, and clock quality.
- Executable predicates, entity keys, time window, cardinality, ordered correlation, suppression, and benign/false-positive cases.
- Correct Sigma metadata: `status: stable` only if lifecycle evidence supports it; `level: critical` only if impact warrants it.

Evidence required: telemetry samples or schema, retention/clock/collection evidence, executable backend validation, offline fixtures showing expected matches and exclusions, scope reference, skill/version/source, observation time, authorization, and runtime-control evidence. Do not claim analytic coverage or production readiness until these are recorded.
