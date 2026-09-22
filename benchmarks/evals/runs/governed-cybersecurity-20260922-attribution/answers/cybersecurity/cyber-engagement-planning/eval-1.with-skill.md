# Synthetic Cyber Exercise Engagement Plan

## 1. Objective and success criteria

- **Objective:** Evaluate detection, triage, escalation, and evidence-collection procedures against a fully synthetic security scenario.
- **Success observation:** Exercise control confirms that participants identify the simulated event, record required evidence, follow escalation procedures, and stop cleanly at expiry.
- **Engagement reference:** `SYN-EX-2026-09-23-01`
- **Window:** 23 September 2026, 10:00–12:00 ICT (maximum two hours).
- **Accountable owner:** Exercise owner, Security Operations Lead.
- **Status:** Planning artifact only; completion is not authorization.

## 2. Scope

### In scope

- Synthetic assets named `SYN-ENDPOINT-01`, `SYN-SERVER-01`, and `SYN-LOGSTORE-01`.
- Mock alerts, synthetic logs, fabricated indicators, and pre-generated exercise records.
- Defensive activities: alert review, investigation, evidence correlation, severity assessment, incident communication, and tabletop decision-making.
- Offline review of procedures and evidence quality.

### Explicit exclusions and non-goals

- All production systems, networks, cloud accounts, customer environments, and real external targets.
- Real credentials, secrets, personal data, customer data, or live authentication.
- Malware, exploit payloads, persistence, privilege escalation, lateral movement, phishing, scanning, or exploitation.
- Changes to firewall rules, endpoint configurations, identity systems, routing, logging pipelines, or production data.
- Data deletion, service disruption, destructive testing, or availability-impacting activity.
- External communications, law-enforcement contact, customer notification, or public disclosure.
- Measuring real-world compromise or claiming production readiness.

## 3. Roles and authorization

- **Requester:** Security Operations Lead.
- **Approver:** Designated security executive or system owner.
- **Operator:** Exercise facilitator and assigned analysts.
- **Exercise control:** Facilitator, who releases synthetic injects and maintains the event clock.
- **Adjudicator:** Independent reviewer who determines whether success criteria were met.
- **Escalation:** Security executive, with technical and legal contacts identified before the exercise.

Written authorization must identify `SYN-EX-2026-09-23-01`, the synthetic assets, the two-hour window, permitted actions, exclusions, and named personnel. Roles do not replace authorization. Production modifications require separate approval.

## 4. Permitted and prohibited actions

### Permitted

- Review synthetic alerts and records.
- Query the supplied offline dataset.
- Correlate fabricated indicators.
- Draft incident notes and escalation messages for exercise review.
- Capture timestamps, decisions, observations, and evidence references.
- Pause or terminate the exercise.

### Prohibited

- Connecting to production or external systems.
- Executing payloads, attack commands, or destructive steps.
- Using credentials or secrets.
- Sending real messages or making real configuration changes.
- Introducing unapproved data into the exercise environment.
- Extending the window without documented restart approval.

## 5. Data handling and communications

- Use synthetic data only; label all artifacts `SYNTHETIC—EXERCISE`.
- Store evidence in the designated exercise repository with access limited to participants and reviewers.
- Do not copy exercise artifacts into production case-management systems unless separately approved.
- Communications must use the exercise channel and clearly state that all events are simulated.
- Any suspected real-world impact requires immediate stop and escalation through the designated channel.

## 6. Runtime controls

This plan is **offline-only** because no runtime enforcement or host-control integration is available. Live execution is blocked.

Before starting, the facilitator must verify:

1. Written authorization is recorded.
2. Synthetic asset inventory matches the scope.
3. Production and external connectivity is absent or technically blocked.
4. Synthetic datasets and evidence storage are available.
5. The stop channel, escalation contacts, and clock owner are confirmed.
6. The adjudicator has the success criteria and evidence template.

## 7. Expiry and stop criteria

The plan expires automatically at **12:00 ICT on 23 September 2026**.

Stop immediately if:

- Any real asset, credential, personal data, or production system is encountered.
- Connectivity leaves the approved synthetic boundary.
- An unapproved action is requested or performed.
- Data integrity, confidentiality, or availability could be affected.
- A participant cannot confirm whether an artifact is synthetic.
- The exercise-control channel becomes unavailable.
- The approver or exercise owner directs termination.
- The two-hour limit is reached.

## 8. Restart authority and gates

Only the approver, after consultation with the accountable owner and adjudicator, may authorize a restart. A restart requires:

- A new or amended authorization.
- Reconfirmed scope, exclusions, personnel, and expiry.
- Review of the stop reason and corrective controls.
- Confirmation that no production impact occurred.
- A new `observed_at` timeline and evidence record.

No participant may restart independently.

## 9. Evidence requirements

Each observation must record:

- `engagement_scope_ref`: `SYN-EX-2026-09-23-01`
- `skill_version`: `cyber-engagement-planning`
- `source`: synthetic alert, synthetic log, participant statement, or exercise-control inject
- `observed_at`: timestamp in ICT
- `finding_status`: planned, observed, substantiated, unsubstantiated, or closed
- `evidence_refs`: references to stored exercise artifacts
- `limitations`: offline-only constraints, unavailable telemetry, or simulation assumptions
- `accountable_owner`: Security Operations Lead

The adjudicator records whether each success criterion was met and preserves the final exercise record.

## 10. Unresolved decisions

Before authorization, confirm:

- Named approver and escalation contacts.
- Exact offline dataset and evidence repository.
- Technical method for preventing production connectivity.
- Participant roster and facilitator.
- Adjudication rubric.
- Retention and disposal period for synthetic artifacts.
- Any framework mapping; uncertain mappings must be marked explicitly and supported by primary framework sources.
