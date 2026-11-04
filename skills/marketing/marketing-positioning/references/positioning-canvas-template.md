# Positioning Canvas Template

Use this canvas to document and review evidence-backed positioning for developer tools.

```markdown
# Product Positioning Canvas: [Product Name]

## Metadata
- **Product Slug**: [kebab-case]
- **Target Context Revision**: [commit-hash / ledger revision]
- **Date**: YYYY-MM-DD
- **Positioning Status**: [proposal_hypothesis | verified_positioning]
- **Owner**: [Research / Product Marketing Owner]

## 1. Target Segment & Boundary
- **Primary Segment**: [Specific developer profile, language ecosystem, tooling environment]
- **Workflow Trigger**: [When / where the problem occurs in their development cycle]
- **Non-Target Segments**: [Developers or projects explicitly out of scope]

## 2. Customer Problem Context
- **Core Friction**: [Pain point backed by CLM / SRC or marked with assumption tag]
- **Research Provenance**: [Direct interviews (consented) OR assumption: proxy_derived]

## 3. Competitive Alternatives Matrix (AC-18)
| Alternative Category | Alternative Name | Why Developers Choose It | Limitations & Drawbacks | Evidence Reference |
|---|---|---|---|---|
| **DIY / Scripting** | [Name of custom script / internal tool] | [Developer rationale for building custom] | [Evidenced drawback; do not invent] | [SRC/CLM ref or assumption tag] |
| **Do Nothing** | [Current manual process / status quo] | [Rationale for deferring adoption] | [Evidenced friction in current workflow] | [SRC/CLM ref or assumption tag] |
| **Direct Tooling** | [Candidate direct tool / library] | [Primary appeal of candidate tool] | [Documented limitation or trade-off] | [SRC/CLM ref or assumption tag] |

## 4. Differentiating Value Drivers (Evidence-Qualified)
1. **Differentiator 1**: [Differentiated capability]
   - *Supporting Evidence*: [CLM ref / test artifact or assumption tag if unverified]
   - *Scope Limitation*: [Known operational boundary, environment constraint, or prerequisite]
2. **Differentiator 2**: [Differentiated capability]
   - *Supporting Evidence*: [CLM ref / test artifact or assumption tag if unverified]
   - *Scope Limitation*: [Known operational boundary, environment constraint, or prerequisite]

## 5. Positioning Statement
> For [Target Segment] who struggle with [Core Friction], [Product Name] is a [Category Definition] that [Differentiator 1]. Unlike [DIY / Alternative Name], [Product Name] provides [Differentiator 2] within [Scope Limitation], as evidenced by [Supporting Evidence Ref].

## 6. Assumptions & Review Triggers
- **Inherited Assumptions**: [List any proxy-derived assumptions from audience research]
- **Revisit Triggers**: [Changes in alternative landscape, negative benchmark findings, or architecture changes]
```
