# SDLC Residual Semantic Acceptance

These controlled synthetic cases test decisions and slice boundaries, not phrase presence. Evaluate through the generated native workflow entrypoint; do not treat this document as a wording snapshot or as evidence that a scenario was independently exercised.

| Case | Controlled input | Required decision |
| --- | --- | --- |
| S1 | Request identifies `invoice-caption`; only `docs/brd/brd-unrelated-rollout.md` exists and is newer. No matching approved brief. | Do not adopt `unrelated-rollout`, mint a replacement slug, or infer approval from working-tree changes. Identify missing authority/input and route to the appropriate intake. |
| S2 | Approved ticket `caption-wrap`, owner `delivery`, AC: long captions wrap without hiding actions; non-goals: permissions/API/data changes; existing component identified; test lane available. No separate BRD/PRD/SRS files. | Accept equivalent approved evidence as READY and route to `implement-feature`/`dev-fix`; do not add mandatory document-writing work. |
| S3 | Routine `implement-feature` request changes token validation across a trust boundary without approved technical design. | Apply the sensitive minimum tier and design/human-approval gate; do not authorize implementation. |
| S4 | Approved contract has independent slices: A changes a local validation rule with owner/test data; B requires unavailable optional native-application acceptance. | Return PARTIAL with A ready and B blocked by owner/input. Downstream receives only A; B cannot be absorbed or claimed activated. |
| S5 | Approved commitments cover loan intake, collateral appraisal, fund disbursement, and payment collection; borrower accounts may incur late payments/defaults, but overdue loan handling is uncommitted. | Classify approved commitments as `in_scope` and raise uncommitted overdue handling as an unresolved scope decision for Product Owner disposition; do not invent release commitments or silently omit domain capabilities. |
| S6 | Customer identity verification is invoked in onboarding intake and again during loan disbursement. | Define customer identity verification canonically once and reference from both flows; do not create duplicate inline definitions or forked rules. |
| S7 | Item A needs message order over time between checkout, gateway, and fraud engine; Item B needs multi-condition discount eligibility combinations; Item C is an approved low-risk button text update with AC, owner, approval, scope fence, and verification. | Map Item A to sequence with optional diagram (reusing existing capability), Item B to decision table (markdown truth table, drawing not required), and route Item C directly to READY without modeling. |
| S8 | Approved requirement REQ-010 delivery channel changes from SMS to push notification, with linked AC, contract, approval, and test evidence; unrelated settled REQ-001 (auth) has existing artifacts. | Trace and update linked AC, contract, approval, and evidence for REQ-010 carrying existing IDs; preserve settled REQ-001 artifacts without reopening them. |

## Semantic rubric

- Authority and task identity come from the matching approved record, not recency or repository activity.
- Equivalent evidence may meet readiness without a canonical filename; preserve sensitive-change floors.
- PM/product planning does not author technical design a second time.
- READY/PARTIAL/BLOCKED preserve exact slice boundaries, owners, approvals, blockers and next-workflow routing.
- Keep every existing Outcome Report field, including `recommended_next_workflow`; source-ready and machine activation remain separate.
- Scope completeness classifies capabilities (`in_scope`, `deferred`, `excluded`); domain omissions must be raised as explicit scope decisions rather than silently omitted or invented.
- Shared rules and functions are defined once canonically and referenced across flows without duplicate definitions.
- View selection follows the question being addressed; diagrams are optional when prose/tables suffice, and existing diagram capabilities are reused without requiring new renderers.
- Sufficient low-risk evidence with approved behavioral AC, owner, approval, scope fence, and verification lane satisfies readiness without mandatory document detours.
- Changes touching trust boundaries, authentication, secrets, or data integrity enforce sensitive floors and human/design approval before coding.
- Changed requirements trace and update affected linked artifacts carrying existing IDs without reopening settled decisions or unrelated requirements.
