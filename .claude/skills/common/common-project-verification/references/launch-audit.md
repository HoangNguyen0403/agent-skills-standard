# Launch Audit Contract

Use for medium/high feature verification only; do not make new lanes mandatory for brief or low-tier work. This is technical verification, not business acceptance or release authority.

## Scope and independence

1. Resolve the approved task, canonical criteria, and project-owned kit. Record canonical locator, immutable revision/digest, and raw criterion IDs; never copy or revise criteria.
2. Before execution, inventory all four lanes with `required`, `applicable`, criterion IDs, and a reason. Applicability and requiredness come from approved scope and criteria, not available evidence. A required lane cannot be downgraded to avoid a gap. Mark `NOT APPLICABLE` only when the lane is genuinely irrelevant; state why and identify the considered criteria.
3. For each applicable lane, use a fresh context with its bounded concern, frozen criteria, relevant scope/dependencies, and necessary evidence only. Lanes: user journeys; abnormal states; changed hot-path performance; input/permission security. Do not fan out per stage or provide implementer narrative.
4. Reuse the authorized kit ingress, read-only doctor, assigned target owner, and owned cleanup. Drive only a healthy target with a real entrypoint. Missing runtime, driver, data, or authority blocks only dependent lanes; name the gap and accountable owner. Do not invent commands, mutate environments automatically, or treat mocks/source inspection as live proof.
5. Record each lane's result, criterion IDs, observed action/result, durable evidence reference, and limitations. Preserve evidence after cleanup. Reuse historical proof only when source, build, recipe, harness, and dependency identities establish scoped freshness; timestamps alone never do.

## Result and routing

Lane statuses are `PASS | FAIL | NOT RUN | NOT APPLICABLE`. Require all four lane rows, in fixed order; each records requiredness, applicability, criteria, evidence, owner, and a finite reason code: `CRITERIA_PASS`, `CRITERION_FAILED`, `REQUIRED_PROOF_NOT_RUN`, `MISSING_REQUIRED_PROOF`, or `OUT_OF_SCOPE`. `NOT RUN` or missing required proof forces `BLOCKED` and requires an accountable owner plus a durable `Details` artifact locator and SHA-256 digest whose content names the missing prerequisite and gap. `NOT APPLICABLE` requires `Required=NO`, `Applicable=NO`, `Reason=OUT_OF_SCOPE`, `Evidence=NONE`, and a durable `Details` artifact locator and digest documenting considered scope and why it is irrelevant. Resolve each locator and verify its digest; a reason code or unverified declaration is not the details proof. Detail content is explanatory, cannot override finite verdict/routing fields, and must not contain credentials. A required lane cannot be downgraded based on evidence availability.
A required `FAIL` forces audit verdict `FAIL` and routes to `REMEDIATE`.

Use this complete report shape. The lane set, order, fields, and enums are closed; `Details` references use `locator@sha256:<64 lowercase hex>`. Every lane uses `Details=NONE` unless required NOT RUN/missing proof or NOT APPLICABLE, when a verified durable detail artifact is mandatory. No prose, extra fields, prefix, or suffix is allowed; explanations belong only in the referenced artifact.

```text
Launch audit
Source: <single-line locator> | Revision: <immutable revision or digest>
Journeys: Required=<YES|NO>; Applicable=<YES|NO>; Status=<PASS|FAIL|NOT RUN|NOT APPLICABLE>; Reason=<finite code>; Criteria=<IDs|NONE>; Evidence=<single-line ref|NONE>; Details=<NONE|locator@sha256:digest>; Owner=<single-line owner|NONE>
Abnormal states: Required=<YES|NO>; Applicable=<YES|NO>; Status=<PASS|FAIL|NOT RUN|NOT APPLICABLE>; Reason=<finite code>; Criteria=<IDs|NONE>; Evidence=<single-line ref|NONE>; Details=<NONE|locator@sha256:digest>; Owner=<single-line owner|NONE>
Changed hot-path performance: Required=<YES|NO>; Applicable=<YES|NO>; Status=<PASS|FAIL|NOT RUN|NOT APPLICABLE>; Reason=<finite code>; Criteria=<IDs|NONE>; Evidence=<single-line ref|NONE>; Details=<NONE|locator@sha256:digest>; Owner=<single-line owner|NONE>
Input/permission security: Required=<YES|NO>; Applicable=<YES|NO>; Status=<PASS|FAIL|NOT RUN|NOT APPLICABLE>; Reason=<finite code>; Criteria=<IDs|NONE>; Evidence=<single-line ref|NONE>; Details=<NONE|locator@sha256:digest>; Owner=<single-line owner|NONE>
Verdict: <PASS|FAIL|BLOCKED|NOT APPLICABLE>
Routing: <EXISTING_WORKFLOW|REMEDIATE|BLOCKED>
```

`PASS` requires every required and applicable criterion to have current passing proof; justified inapplicable lanes do not block. `NOT APPLICABLE` is the audit verdict only when all four lanes are justified inapplicable. `EXISTING_WORKFLOW` is technical routing only, not UAT, business acceptance, release approval, or permission to expose traffic. Never route `FAIL`, `BLOCKED`, or required missing/NOT RUN proof to UAT as verified. A PASS remains technical evidence only; existing human and workflow authority is unchanged.

## Fresh-context lane boundaries

- **Journeys:** exercise mapped entry paths and observable outcomes against exact criteria.
- **Abnormal states:** test approved failure, recovery, and boundary states; do not invent criterion coverage.
- **Changed hot-path performance:** measure only changed performance-sensitive paths against approved budgets and a comparable baseline; absent budget/baseline is a named gap, not an invented threshold.
- **Input/permission security:** probe relevant input validation and authorization boundaries without using secrets or exceeding granted scope. Missing authority blocks the dependent probe.
