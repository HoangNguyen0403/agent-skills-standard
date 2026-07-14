Current status: `partial/unverified`. Existing code is implementation evidence only; without a PRD and acceptance criteria, it is not ready for product or QA sign-off.

Assumptions: this is one feature, no linked BRD objective or business success metric is available, and ownership is TBD.

Before approval, complete Discovery:

1. What outcome and BRD objective does this feature support?  
   a) Revenue/conversion  
   b) Retention/engagement  
   c) Operational efficiency

2. Which channels are in scope?  
   a) Web  
   b) Mobile  
   c) Both

3. Who is the specific persona/JTBD?  
   a) End customer  
   b) Admin/operator  
   c) Internal support or sales

4. What rollout is required?  
   a) Immediate release  
   b) Feature flag or phased rollout  
   c) Pilot/limited audience

5. Who owns validation?  
   a) Product/PM  
   b) Engineering  
   c) QA/release

Then create `docs/prd/prd-[slug].md` using the PRD template. The PRD must include:

- User stories with persona, business value, and INVEST self-check.
- Stable `REQ-*` requirements linked to the BRD objective.
- `AC-*` Given/When/Then criteria covering happy, edge, negative, zero-state, and error-state flows.
- Product, Engineering, and QA/release owners; status and priority for every requirement.
- Performance target, security expectations, offline behavior, API/database impacts, analytics events, guardrails, rollout, support readiness, risks, decisions, and changelog.
- Explicit out-of-scope items.
- RACI for PM/BA, Engineering, and QA/release.

Minimum traceability format:

| Requirement | Acceptance criteria | Objective | Owner | Status | Verification |
|---|---|---|---|---|---|
| `REQ-001` | `AC-001`, `AC-002` | `BRD-OBJ-001` or `TBD` | `TBD` | Draft | QA |

Do not treat the existing code as complete until `implementation-readiness` confirms that every implementation slice has linked `REQ-*`, `AC-*`, owner, status, priority, and verification evidence. The next workflow is therefore: Discovery → PRD in `docs/prd/` → `implementation-readiness` → QA verification.
