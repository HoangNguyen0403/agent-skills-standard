# Audience Segment Template

Use this template to document developer audience segments resulting from evidence-based research.

```markdown
# Developer Segment: [Segment Name]

## Metadata
- **Segment ID**: seg-[kebab-case]
- **Research Date**: YYYY-MM-DD
- **Context Revision**: [commit-hash or ledger revision]
- **Evidence Classification**: [consented_primary | public_documented | proxy_inferred]
- **Lead Researcher**: [Owner Name / Role]

## 1. Segment Definition
- **Profile**: Primary technical role, language stack, and workflow characteristics.
- **Workflow Context**: Day-to-day tooling, integration points, and team size.
- **Explicit Non-Targets**: Adjacent profiles that this segment deliberately excludes.

## 2. Evidence Provenance & References
| Evidence ID | Source Ref / URL | Type | Date | Description |
|---|---|---|---|---|
| EVD-001 | SRC-001 / https://... | Public Issue / Interview | YYYY-MM-DD | Brief statement |

## 3. Verified Findings vs. Proxy Assumptions
### Verified Customer Findings (Direct Consented Data Only)
- **FND-001**: [Verified problem statement backed by primary participant quotes/sessions].

### Proxy Assumptions (Secondary / Indirect Data)
- **ASM-001 [assumption: proxy_inferred]**: [Inferred problem or belief derived from issue trends or documentation queries].

## 4. Contradictions & Dissenting Workflows
- **CON-001**: [Conflict observed between different segment subsets; retain scope for both].

## 5. Sample Limitations & Bias Disclosure (AC-17)
- **Sample Size ($N$)**: [Total observed entities / interviews]
- **Channels Analyzed**: [e.g. GitHub Discussions, Reddit r/commandline]
- **Selection Bias**: [Identified bias factors]
- **Underrepresented Groups**: [Identified gaps in segment coverage]
```
