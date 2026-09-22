Assumptions: approved exercise plan is active for `EX-2026-09-22`; scope is synthetic data and designated exercise systems only; runtime support, roles, exclusions, and authorization are confirmed. No real credentials, production changes, attack commands, or real-target contact are permitted.

### Inject schedule

| ID | Time (ICT) | Owner | Trigger | Expected channel | Abort condition |
|---|---:|---|---|---|---|
| SYN-01 | 09:00 | Exercise Control | Scenario start | Exercise Slack channel | Authorization or runtime gate unavailable |
| SYN-02 | 09:20 | Exercise Control | Participant acknowledges SYN-01 | Exercise bridge + ticket | Scope drift, unsafe impact, or data exposure |
| SYN-03 | 09:45 | Exercise Control | Response team declares containment | Exercise bridge | Authorization expiry or unsupported runtime |

### Release decision log

```text
engagement_scope_ref: EX-2026-09-22
skill_version: cyber-exercise-control
source: Exercise Control
observed_at: 2026-09-22T09:00:00+07:00
inject_id: SYN-01
release_decision: RELEASED
authority: Exercise Director
finding_status: Not applicable; synthetic exercise event
evidence_refs: [exercise-plan-v1, authorization-record]
limitations: Synthetic alert only; no operational action authorized
accountable_owner: Exercise Control
```

```text
engagement_scope_ref: EX-2026-09-22
skill_version: cyber-exercise-control
source: Exercise Control
observed_at: 2026-09-22T09:20:00+07:00
inject_id: SYN-02
release_decision: RELEASED
authority: Exercise Director
finding_status: Not applicable; synthetic escalation event
evidence_refs: [SYN-01-acknowledgement, exercise-bridge-log]
limitations: No production escalation or real data handling
accountable_owner: Exercise Control
```

```text
engagement_scope_ref: EX-2026-09-22
skill_version: cyber-exercise-control
source: Exercise Control
observed_at: 2026-09-22T09:45:00+07:00
inject_id: SYN-03
release_decision: RELEASED
authority: Exercise Director
finding_status: Pending independent adjudication
evidence_refs: [SYN-02-response, exercise-bridge-log]
limitations: Control does not grade its own outcome; adjudication remains independent
accountable_owner: Exercise Control
```

If authorization expires, scope drifts, unsafe impact or data exposure occurs, or runtime support becomes unavailable: pause and stop the exercise, record the decision, and make no silent scope change. Restart requires fresh authorization and runtime gates plus a recorded restart decision.
