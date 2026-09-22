Do not label this test **detected**. The violated guardrail is: **“No defensive outcome without linked action and observation evidence.”** A single log line is observation-only evidence and cannot establish detection.

Stop and restart the validation using a controlled synthetic/offline fixture. Verify runtime, scope/approval, permitted action, owner, expected observation, and stop condition. Capture and link:

- Authorized action record
- Observation record containing the log line
- Shared test ID, entity, observation time/window, and source

Proceed only after those records are reviewable. If the action exists but the observation is absent or unusable, classify **telemetry-gap**. Until an action record exists, status is **unvalidated**, not detected.

Record the scope reference, skill/version/source, finding status, limitations, owner, and framework/version/ID, relation, rationale, source, and review status.
