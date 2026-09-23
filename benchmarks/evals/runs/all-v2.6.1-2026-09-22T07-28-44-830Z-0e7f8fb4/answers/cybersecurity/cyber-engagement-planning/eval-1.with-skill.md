# Synthetic Cyber Exercise Engagement Plan

## 1. Objective and window

- **Objective:** Validate that the exercise team can identify, communicate, contain, and document a simulated security event using synthetic telemetry.
- **Success observation:** The team records a complete timeline, assigns an adjudicated finding status, follows escalation paths, and produces evidence for each planned observation.
- **Window:** 22 September 2026, 14:00–16:00 ICT.
- **Expiry:** Authorization expires at 16:00 ICT; all activity stops automatically at expiry.
- **Accountable owner:** Exercise sponsor, pending named approval.
- **Engagement reference:** `SYN-EX-2026-09-22-01`.
- **Mode:** Offline-only tabletop/simulation. No runtime support or live-target authorization is assumed.

This plan is not approval. Execution requires documented authorization before commencement.

## 2. Scope

### In scope

Synthetic assets only:

- `SYN-ENDPOINT-001`
- `SYN-IDENTITY-001`
- `SYN-LOGSTORE-001`
- Synthetic incident records, logs, alerts, and diagrams created for this exercise.

### Explicit exclusions and non-goals

- Production, staging, or internet-connected systems.
- Real hosts, domains, IP addresses, identities, credentials, secrets, or customer data.
- Payloads, attack commands, exploit execution, credential use, persistence, lateral movement, or destructive actions.
- Changes to production configuration, access controls, routing, logging, or data.
- Social engineering, phishing, malware delivery, denial of service, vulnerability exploitation, and physical access.
- Real notifications to customers, regulators, law enforcement, or external providers.
- Treating team roles as authorization.
- Treating exercise findings as confirmed production vulnerabilities.

Any production modification requires separate written approval.

## 3. Roles

- **Requester:** Exercise coordinator.
- **Approver:** Named system or security owner with authority over the synthetic environment.
- **Operator:** Exercise facilitator executing only approved simulation steps.
- **Exercise control:** Timekeeper and safety controller empowered to pause the exercise.
- **Adjudicator:** Independent reviewer who determines finding status and resolves disputes.
- **Escalation owner:** Accountable owner responsible for unresolved safety, scope, or authorization decisions.

## 4. Allowed actions

- Generate or review synthetic alerts and pre-created event records.
- Walk through detection, triage, escalation, containment, recovery, and evidence workflows.
- Record decisions, timestamps, observations, limitations, and evidence references.
- Use simulated communications clearly labeled `EXERCISE—NOT REAL`.
- Compare observations against an approved framework mapping.

## 5. Prohibited actions and controls

- No live system interaction, scanning, exploitation, credential handling, or payload execution.
- No real outbound communications or changes to access, infrastructure, or data.
- Exercise materials must remain in the designated synthetic workspace.
- Use synthetic identifiers only; redact accidental sensitive data immediately and notify exercise control.
- Exercise control pauses the session for scope ambiguity, suspected real impact, unsafe behavior, data exposure, or loss of authorization.

## 6. Stop, expiry, and restart criteria

Stop immediately if:

- A real asset, identity, credential, or data record is encountered.
- Activity could affect a non-synthetic system.
- Authorization, scope, or runtime controls cannot be verified.
- A participant proposes a prohibited action.
- Exercise control or the accountable owner issues a stop order.
- The 16:00 ICT expiry is reached.

Restart requires documented approval from the approver and exercise control, confirmation that scope and controls are restored, and a new restart time. Expired authorization cannot be silently extended.

## 7. Authorization and framework mapping

- Required authorization artifact: `authorization_ref` linked to `SYN-EX-2026-09-22-01`.
- Framework mapping: map observations to the selected primary framework source; uncertain mappings must be marked `uncertain` and reviewed by the adjudicator.
- Production actions, if later requested, require a separate authorization and engagement plan.

## 8. Evidence record

Each observation must include:

```text
engagement_scope_ref: SYN-EX-2026-09-22-01
skill_version: cyber-engagement-planning
source: synthetic exercise artifact or approved primary framework source
observed_at: ISO-8601 timestamp
finding_status: planned | observed | not_observed | uncertain | closed
evidence_refs: links or identifiers to synthetic records
limitations: scope, tooling, simulation, or runtime limitations
accountable_owner: named person or role
```

## 9. Unresolved decisions before execution

- Name the requester, approver, operator, exercise control, adjudicator, escalation owner, and accountable owner.
- Confirm the authorization artifact and synthetic workspace.
- Select and approve the primary framework mapping.
- Confirm that all participants understand the offline-only restriction and stop criteria.
