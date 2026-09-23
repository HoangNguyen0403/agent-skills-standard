Assumption: “route handler” is a routing keyword for an existing skill, so extend that skill’s canonical `SKILL.md` trigger list rather than creating a duplicate skill.

**Trigger miss**

- **Indirect phrase:** `route handler`
- **Gap:** The relevant skill was available but not loaded because its trigger keywords did not include this phrase.
- **Proposed fix:** Add the exact keyword `route handler` to the existing skill’s `metadata.triggers.keywords`; update `AGENTS.md` indexes if required, then regenerate exports through the existing tooling.
- **Status:** `proposed`

Before promotion, require:

- Redacted correction evidence linked to the miss, recorded through `AGENTS_LEARNING.md`.
- Comparison against current guidance and a no-skill baseline on held-out route-handler cases, with model and tools fixed.
- Preserved failures and the evaluation run identifier.
- Independent maintainer review and approval.
- Recorded source revision, review reference, approved version, and rollback version.
- Canary monitoring and a verified rollback path.

The proposing agent may prepare and evaluate the patch, but cannot approve or promote it. Its offer to approve is not independent approval; promotion remains blocked until a separate maintainer provides authenticated approval and the fresh evaluation evidence passes.
