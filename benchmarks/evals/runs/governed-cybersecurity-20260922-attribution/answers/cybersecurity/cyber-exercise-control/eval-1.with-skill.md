Assumptions: approved exercise plan and authorization are active through 2026-09-22 12:00 UTC; production systems, real credentials, real targets, and real data are excluded; runtime supports only synthetic artifacts. White Team controls releases; Safety Officer owns abort decisions; independent Adjudication receives observations.

### Inject schedule

| ID | Release | Owner | Trigger | Channel | Abort condition |
|---|---|---|---|---|---|
| I-01 | 09:00 UTC — Release | White Team Control | Exercise start and safety gate pass | Exercise chat + synthetic email artifact | Authorization or runtime gate fails; real recipient/data appears |
| I-02 | 09:30 UTC — Release after I-01 acknowledgment | White Team Control | I-01 acknowledgment recorded | Exercise chat + synthetic endpoint alert | Scope drift, unsafe impact, or unsupported runtime |
| I-03 | 10:00 UTC — Release after I-02 acknowledgment | White Team Control | I-02 acknowledgment and Safety Officer approval | Exercise chat + synthetic escalation ticket | Data exposure, authorization expiry, or contact with a real target |

### Control log

| observed_at | decision | authority | engagement_scope_ref | skill_version | source | finding_status | evidence_refs | limitations | accountable_owner |
|---|---|---|---|---|---|---|---|---|---|
| 2026-09-22T09:00:00Z | I-01 released | Exercise Director; White Team Control | EX-2026-09-22-SYNTHETIC | cyber-exercise-control; version not supplied | Exercise Control | released | CTRL-I01-RELEASE, AUTH-EX-01 | Synthetic artifact only; no runtime enforcement by this record | White Team Lead |
| 2026-09-22T09:30:00Z | I-02 released | Exercise Director; Safety Officer | EX-2026-09-22-SYNTHETIC | cyber-exercise-control; version not supplied | Exercise Control | released | CTRL-I02-RELEASE, ACK-I01 | Depends on recorded I-01 acknowledgment | White Team Lead |
| 2026-09-22T10:00:00Z | I-03 released | Exercise Director; Safety Officer | EX-2026-09-22-SYNTHETIC | cyber-exercise-control; version not supplied | Exercise Control | released | CTRL-I03-RELEASE, ACK-I02 | Depends on recorded I-02 acknowledgment; ground truth remains separate | White Team Lead |

If any stop condition occurs, pause immediately, record the authority and reason, notify all exercise channels, and do not continue silently. A restart requires fresh authorization and runtime safety gates plus a recorded restart decision. Observations go to independent adjudication; control does not self-adjudicate outcomes.
