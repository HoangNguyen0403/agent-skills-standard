# Channel Matrix Template

Use this template to evaluate candidate channels and record bounded strategy selections.

```markdown
# Marketing Campaign Strategy: [Campaign Name]

## Metadata
- **Campaign ID**: [kebab-case]
- **Target Context Revision**: [commit-hash / ledger revision]
- **Date**: YYYY-MM-DD
- **Campaign State**: prepared (AC-04 proposal gate)
- **Strategy Owner**: [Name / Campaign Owner]
- **Human Authority**: [DEC reference or null (unauthorized proposal)]

## 1. Resource Boundaries
- **Maintainer Labor Budget**: [Allocated maintainer hours/week]
- **Authorized Cash Budget**: [$0.00 USD or approved financial limit]
- **Campaign Window**: [Start-date to end-date (half-open [T_start, T_end))]

## 2. Selected Channel Mix (AC-20)
| Channel | Target Developer Segment | Estimated Labor (Hrs) | Estimated Cash ($) | Core Content Asset | Desired Action |
|---|---|---|---|---|---|
| [Channel 1] | [Target developer segment] | [Estimated hours] | [Estimated cash] | [Asset locator / ref] | [Target outcome] |
| [Channel 2] | [Target developer segment] | [Estimated hours] | [Estimated cash] | [Asset locator / ref] | [Target outcome] |

## 3. Rejected Channels Matrix (AC-20)
| Candidate Channel | Evaluation Rationale | Rejection Category | Trade-off / Decision Reason |
|---|---|---|---|
| [Candidate Channel 1] | [Why channel was considered] | [`budget_exceeded` \| `capacity_insufficient` \| `community_policy_conflict` \| `audience_mismatch` \| `negative_trust_risk`] | [Documented reason for rejection] |
| [Candidate Channel 2] | [Why channel was considered] | [`budget_exceeded` \| `capacity_insufficient` \| `community_policy_conflict` \| `audience_mismatch` \| `negative_trust_risk`] | [Documented reason for rejection] |

## 4. Community Norms & Compliance Checklist
- [ ] No unsolicited direct messages, cold emails, or private outreach.
- [ ] No automated or promotional spamming on developer platforms or community forums.
- [ ] Transparent self-identification in all community interactions.
- [ ] All claims strictly linked to verified context revision proof records.

## 5. Decision & Governance Gates
- **Current State**: `state: "prepared"` (no live posting or spend authorized)
- **Pending Approvals**: [Human owner DEC sign-off required before asset publication or campaign activation]
```
