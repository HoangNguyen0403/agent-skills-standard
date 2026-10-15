# Ethical Guidelines and Automated Stop Rules

## Priority: P0 (CRITICAL)

This document establishes ethical standards, consent protocols, and automated stop triggers for product experimentation within `agent-skills-standard` under t01-v2.

---

## 1. Ethical Eligibility Framework

1. **User Welfare & Non-Maleficence**:
   - Experiments must never deliberately degrade core security, privacy, accessibility, or safety standards for any group of users.
   - Deceptive patterns ("dark patterns"), fake availability that captures payments for non-existent goods, or discriminatory pricing without disclosed terms are strictly prohibited.
2. **Informed Consent & Transparency**:
   - For user interviews, qualitative usability tests, or beta prototype trials involving identifiable customer data, explicit written consent is mandatory.
   - For in-product feature flag testing, terms of service and privacy policies must cover operational feature experimentation.
3. **Vulnerable Cohorts**:
   - Experiments involving minors, financially vulnerable users, or regulated domains (health, legal, credit) require heightened human ethical review and cannot be approved by automated workflows.

---

## 2. Automated Stop Rules

Every authorized experiment must define automated halt criteria in `bounds.stop_rules` that trigger immediate suspension if breached:

1. **Metric Degradation**:
   - A statistically significant degradation in any precommitted guardrail metric (e.g., error rate increased by > 0.5%, latency increased by > 200ms, checkout completion dropped by > 2%).
2. **Support & Churn Spikes**:
   - A surge in customer support escalations or account cancellation requests tied to the experiment variant.
3. **Data Integrity / Privacy Incidents**:
   - Any report of data leakage, unauthorized access, or telemetry failure.

---

## 3. Halting Procedure and Host Authority Gate

When a stop rule triggers:
1. **Host Execution Authority**:
   - Modifying production traffic routing, toggling feature flags, or reverting code requires authenticated host/operator control.
   - If the runtime environment has verified, preauthorized host execution capabilities for emergency stops, trigger the rollback to 100% control immediately and alert the designated experiment owner.
   - If direct host execution capability is unavailable, immediately generate an urgent stop proposal and handoff to the human operator, documenting the breached guardrail. Do NOT claim or simulate live execution without authenticated control.
2. **Ledger Record**:
   - Record the actual halt in the experiment lifecycle with its exact retained triggering evidence and required authorization where applicable. Do not record `purpose: "experiment", outcome: "stop"`; that closed-field combination is forbidden. A recommendation to stop product value requires a `purpose: "value_review", outcome: "stop"` DEC only when its required strategy binding, authority, and artifact proof exists. Otherwise record a lawful proposal and the missing proof. Never invent a decision, approver, or support.
3. **Restart Isolation**:
   - An experiment halted by a stop rule cannot be restarted autonomously.
   - Any restart requires complete root-cause remediation and separate human authorization recorded in a new decision lineage.
