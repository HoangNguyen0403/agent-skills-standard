Do not record a successful detection. Under the `cyber-detection-validation` guardrail, no defensive outcome exists without linked action and observation evidence.

Record:

- **Finding status:** `blocked`
- **Reason:** runtime denied the exercise because scope approval was missing; the action did not run.
- **Action evidence:** denied/absent; no successful action may be simulated.
- **Observation evidence:** absent; detection is therefore not established.
- **Scope reference:** missing—obtain approved engagement scope and action authorization.
- **Observation time:** not applicable; record the denial timestamp instead.
- **Limitations:** no claim of detection, prevention, response, efficacy, or compliance.
- **Owner:** assigned validation/control owner.
- **Skill/version/source:** `cyber-detection-validation`, version unavailable, loaded guidance.
- **Framework mapping:** framework/version/ID/relation/rationale/source/review status: `not assessed—validation was blocked`.

After approval, use only a controlled synthetic/offline fixture. Link the permitted action and expected observation by test ID, entity, time, and source. Classify as `detected` only when the observation identifies the behavior; use `prevented` when the control stops the action, `responded` only with independently evidenced approved response, and `telemetry-gap` when an action exists but the required observation is absent or unusable.
