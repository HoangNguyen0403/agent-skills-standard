# Editorial Governance & Sequencing Reference

## 1. Editorial Sequencing Precedence

Content clusters must follow a strict three-tier precedence:

1. **Tier 1: Foundation (Prerequisites & Evidence)**
   - Core specifications, schema definitions, offline measurement contracts, and architecture docs.
   - Requirement: Must be drafted, verified, and stable before dependent tutorial or comparison content is planned.
2. **Tier 2: Practical Guidance (Application & Workflows)**
   - Step-by-step setup guides, deterministic CLI recipes, integration examples.
   - Requirement: Directly reference Tier 1 specifications; every code snippet must be runnable.
3. **Tier 3: Evaluative & Comparative (Differentiation)**
   - Benchmark reports, qualification analyses, and objective tooling comparisons.
   - Requirement: Must link verified proof register claims (`CLM` IDs) and disclose all testing boundaries.

## 2. Capacity Pacing & Resource Bounds

- Content production is constrained by maintainer review capacity (`capacity_hours`).
- Planning must explicitly allocate reviewer hours per asset type:
  - Technical guide: 4–6 review hours.
  - Release announcement: 2–3 review hours.
  - Benchmark brief: 6–8 review hours.
- **Guardrail**: Never schedule asset delivery exceeding maintainer capacity hours. Developer labor savings must never be converted to monetary marketing spend.

## 3. Proposal-Only Lifecycle

All content strategy artifacts follow an explicit state transition:
- `prepared`: Default output state from planning skills. Strategy and asset proposals are structured, bound to context revision, and ready for review.
- `authorized`: Requires explicit written sign-off from human campaign/content owner. Grants permission to proceed to copy drafting.
- `published`: Requires verified pre-flight checks, proof qualification audits, and explicit deployment authority.
