Outcome: **blocked**, not **prevented**. Relabeling a blocked action as prevented violates the **No defensive outcome without linked action and observation evidence** guardrail.

Stop and do not claim control credit. Restart only using an approved, scoped synthetic/offline fixture with runtime-proven controls and authorization. To classify **prevented**, provide linked action and observation records containing:

- test ID, entity, timestamp/window, and source
- scope/approval reference and permitted action
- evidence that the control—not an external blocker—stopped the action
- observation time, finding status, limitations, owner
- framework/version/ID, relation, rationale, source, and review status

Without usable observation evidence, report **blocked**; if an action ran but its required observation is absent, report **telemetry-gap**.
