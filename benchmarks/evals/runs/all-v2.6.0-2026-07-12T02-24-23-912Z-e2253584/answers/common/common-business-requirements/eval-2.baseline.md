# Business Requirements: Onboarding Automation

## 1. Business objective

Automate the onboarding of a new customer or employee from approved intake through readiness, while reducing cycle time and manual coordination. The process must make ownership explicit, prevent work from starting before required approvals exist, preserve an audit trail, and route exceptions to a human owner.

The initial release should support a standard onboarding path and a small set of documented variations. It should not bypass legal, security, privacy, finance, or manager approvals merely to improve speed.

## 2. Desired outcomes

After baseline measurement, the business should set targets. Recommended initial targets are:

- Reduce median onboarding cycle time by 30%.
- Achieve 95% completion of standard onboarding without manual chasing.
- Complete all required approvals before access, payment, or production privileges are granted.
- Reduce missing-information and rework cases by 50%.
- Provide 100% traceability for requests, decisions, task ownership, timestamps, and exceptions.
- Maintain onboarding satisfaction above the current baseline and keep policy or security violations at zero.

## 3. Scope and actors

### In scope

- A structured onboarding request and validation of required information.
- Selection of an onboarding template based on role, location, department, product, risk, and employment or customer type.
- Creation and assignment of tasks with dependencies, due dates, owners, reminders, and escalation.
- Approval collection, status visibility, notifications, audit history, and completion reporting.
- Integrations with identity/access management, HR or CRM, finance/procurement, email, learning, and ticketing systems where applicable.
- Exception handling, cancellation, reactivation, and controlled offboarding of incomplete requests.

### Actors

- Requester: submits the onboarding request and supplies missing information.
- Hiring manager or account owner: confirms the business need, role, scope, and start date.
- Onboarding Operations: owns the workflow and monitors exceptions.
- IT or Systems Administration: provisions technical accounts and equipment.
- Security and Privacy: approve risk, data handling, and privileged-access decisions.
- HR or Customer Operations: verifies identity and contractual or employment data.
- Finance or Procurement: approves spend, billing, or purchasing commitments.
- Legal or Compliance: approves regulated, contractual, geographic, or policy exceptions.
- Executive sponsor: approves high-cost, high-risk, or policy-exception cases.

## 4. Approval ownership matrix

| Decision or gate | Accountable approval owner | Required contributors | Evidence required |
|---|---|---|---|
| Business need and scope | Hiring Manager or Account Owner | Department lead, requester | Role/product, purpose, start date, scope, cost center or account |
| Identity and eligibility | HR Operations or Customer Operations | Manager, Compliance where applicable | Verified identity, contract or employment record, location |
| Standard workflow selection | Onboarding Operations | IT, Security | Approved template and classification inputs |
| Data classification and privacy | Privacy Officer or Data Protection Owner | Security, Legal, business owner | Data categories, purpose, retention, residency, processing basis |
| Standard access package | IT Service Owner | Hiring Manager, Security | Least-privilege role mapping and approved access list |
| Privileged or sensitive access | Security Owner | System Owner, Manager | Risk assessment, segregation-of-duties check, expiry/review date |
| Equipment, license, or spend | Finance or Procurement Owner | Manager, IT, vendor owner | Cost, budget, supplier, purchase justification |
| Contractual or regulatory exception | Legal or Compliance Owner | Business owner, Security, Privacy | Exception reason, compensating controls, expiry date |
| Readiness to start or launch | Onboarding Operations | All task owners, manager | Required tasks complete, approvals recorded, exceptions resolved |
| Policy-exception escalation | Executive Sponsor | Legal, Security, Finance, business owner | Decision rationale, risk acceptance, review date |
| Workflow/template publication | Onboarding Operations Owner | Process owner, IT, Security, Privacy, QA | Test evidence, version, approvers, rollback plan |

The system must distinguish requester, contributor, approver, and accountable owner. An approver may delegate only to a named, authorized substitute, and the delegation must include a time range and audit record. The requester cannot approve their own request when separation of duties is required.

## 5. Business requirements

| ID | Requirement | Priority |
|---|---|---|
| ONB-001 | Provide a single request form with mandatory fields, validation, duplicate detection, and save-and-resume support. | Must |
| ONB-002 | Select a versioned workflow template from approved classification rules; never silently change a request's workflow after it starts. | Must |
| ONB-003 | Create a dependency-aware task plan with one accountable owner, status, due date, and escalation path per task. | Must |
| ONB-004 | Block provisioning or other irreversible actions until all required gates for that action are approved. | Must |
| ONB-005 | Route each approval to the correct owner based on role, amount, risk, geography, and system ownership. | Must |
| ONB-006 | Notify owners at assignment and before due dates, escalate overdue work, and avoid duplicate notifications. | Must |
| ONB-007 | Show requesters and authorized stakeholders a current status, blockers, next action, and expected completion date. | Must |
| ONB-008 | Record every submission, change, approval, rejection, delegation, automated action, failure, and override with actor and timestamp. | Must |
| ONB-009 | Support rejection with a reason, return-to-requester correction, resubmission, cancellation, and controlled restart. | Must |
| ONB-010 | Retry transient integration failures safely; surface permanent failures to Onboarding Operations and prevent false completion. | Must |
| ONB-011 | Enforce least privilege, data minimization, role-based access, retention, and approved handling of sensitive data. | Must |
| ONB-012 | Provide reports for cycle time, approval aging, completion rate, rework, SLA breaches, access granted, exceptions, and failure rate. | Should |
| ONB-013 | Permit authorized operations staff to pause a workflow or disable a faulty template without deleting audit history. | Must |
| ONB-014 | Support versioned templates with test status, publication approval, effective date, owner, and rollback or retirement state. | Must |

## 6. Target workflow

1. The requester submits the validated onboarding request.
2. The system checks identity, duplicates, required fields, and eligibility.
3. The manager or account owner confirms need, scope, and start date.
4. The system classifies the request and selects an approved versioned template.
5. Required legal, privacy, security, finance, and system-owner approvals run according to dependencies.
6. Approved tasks are assigned and tracked; independent low-risk tasks may run in parallel.
7. Provisioning integrations execute only after their specific gates pass and report success or failure.
8. Onboarding Operations reviews exceptions and confirms readiness.
9. The system publishes completion with an evidence summary and starts any required periodic access review.

## 7. Acceptance criteria

- A standard request with complete information creates the correct task plan and approval owners.
- A missing or invalid required field prevents submission and explains how to correct it.
- A high-risk or privileged request automatically adds the Security approval and blocks access until it is approved.
- A request cannot be self-approved where separation of duties applies.
- Rejection returns the request to the correct party with a reason and preserves the previous decision in the audit log.
- A failed provisioning call is visible as failed or pending; the workflow cannot report complete until the required action is confirmed.
- Overdue tasks escalate according to policy and do not generate duplicate alerts on every retry.
- Authorized users can see status and history; unauthorized users cannot see sensitive fields.
- Operations can pause a workflow and disable a template while preserving in-flight records and audit evidence.
- Reports reconcile completed onboarding records with the source systems for the agreed reporting period.

## 8. Governance, rollout, and risks

Onboarding Operations should own the process catalog and run a pilot for one low-risk department or customer segment. Before production, Security, Privacy, Legal/Compliance, IT, Finance, and the business owner must approve the design and test evidence. Expand only after cycle-time improvement is demonstrated without missed approvals or access-control defects.

Key risks are incorrect role classification, stale approval ownership, integration retries causing duplicate provisioning, and pressure to bypass gates for urgent starts. Mitigations are versioned rules, owner-directory validation, idempotent integrations, explicit emergency procedures, and weekly exception review.

