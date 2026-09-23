Do not record a successful detection. With scope approval missing and the runtime denying execution, classify the result as:

- **Outcome:** `blocked`
- **Finding status:** Not detected; action was denied or could not run
- **Scope reference:** Missing approval
- **Action evidence:** Runtime denial record
- **Observation evidence:** None linked
- **Limitations:** No control efficacy, prevention, detection, or response claim can be made
- **Owner:** Assigned control or detection owner
- **Observation time:** Runtime-denial timestamp
- **Evidence linkage:** Test ID, entity, timestamp, and source must link the action and observation records; currently incomplete

Use `telemetry-gap` only if an authorized action record exists but the required observation is absent or unusable. Use `prevented` only when evidence shows the control stopped the action, `detected` only when linked observation evidence identifies the behavior, and `responded` only with independently evidenced approved response.

To validate detection, obtain scope/engagement approval, define the control hypothesis, permitted synthetic/offline action, entity, test window, expected observation, and stop condition; then rerun with a test ID and capture linked action and observation records. Do not simulate a successful action.

Record the framework edge as pending: framework/version/ID, relation, rationale, source, and review status. Reference the governing skill as `cyber-detection-validation` and its primary references: [NIST SP 800-115](https://doi.org/10.6028/NIST.SP.800-115) and [MITRE ATT&CK Evaluations methodology](https://attackevals.mitre-engenuity.org/). Reuse `cyber-authorization`, `cyber-evidence`, and `cyber-framework-mapping`.
