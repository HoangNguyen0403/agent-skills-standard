# SDLC Residual Semantic Acceptance

These controlled synthetic cases test decisions and slice boundaries, not phrase presence. Evaluate through the generated native workflow entrypoint; do not treat this document as a wording snapshot or as evidence that a scenario was independently exercised.

| Case | Controlled input | Required decision |
| --- | --- | --- |
| S1 | Request identifies `invoice-caption`; only `docs/brd/brd-unrelated-rollout.md` exists and is newer. No matching approved brief. | Do not adopt `unrelated-rollout`, mint a replacement slug, or infer approval from working-tree changes. Identify missing authority/input and route to the appropriate intake. |
| S2 | Approved ticket `caption-wrap`, owner `delivery`, AC: long captions wrap without hiding actions; non-goals: permissions/API/data changes; existing component identified; test lane available. No separate BRD/PRD/SRS files. | Accept equivalent approved evidence as READY and route to `implement-feature`/`dev-fix`; do not add mandatory document-writing work. |
| S3 | Routine `implement-feature` request changes token validation across a trust boundary without approved technical design. | Apply the sensitive minimum tier and design/human-approval gate; do not authorize implementation. |
| S4 | Approved contract has independent slices: A changes a local validation rule with owner/test data; B requires unavailable optional native-application acceptance. | Return PARTIAL with A ready and B blocked by owner/input. Downstream receives only A; B cannot be absorbed or claimed activated. |

## Semantic rubric

- Authority and task identity come from the matching approved record, not recency or repository activity.
- Equivalent evidence may meet readiness without a canonical filename; preserve sensitive-change floors.
- PM/product planning does not author technical design a second time.
- READY/PARTIAL/BLOCKED preserve exact slice boundaries, owners, approvals, blockers and next-workflow routing.
- Keep every existing Outcome Report field, including `recommended_next_workflow`; source-ready and machine activation remain separate.
