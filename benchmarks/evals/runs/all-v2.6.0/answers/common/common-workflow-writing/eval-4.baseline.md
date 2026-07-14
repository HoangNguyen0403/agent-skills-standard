A portable SDLC workflow should explicitly separate completed evidence from blocked verification, so status reporting stays honest even when runtime access is unavailable.

Recommended workflow:

1. Capture scope
   - feature name
   - expected behavior
   - acceptance criteria

2. Record implementation state
   - what changed
   - which artifacts were updated
   - whether code review and local checks were completed

3. Run non-runtime verification
   - static analysis
   - unit tests
   - build checks
   - document exact results

4. Detect runtime verification blocker
   - state what access is missing
   - identify the blocked command, environment, or dependency
   - distinguish “not tested” from “failed”

5. Report status using explicit categories
   - Implemented: code changes are complete
   - Locally verified: non-runtime checks passed or failed
   - Runtime verification blocked: deployment, integration, or environment proof is still pending
   - Ready next step: exact action needed to unblock verification

6. Handoff cleanly
   - include commands to run once access is restored
   - list expected outcomes
   - note any risks that remain unverified

Example status summary:

- Feature: implemented
- Unit tests: passed
- Build: passed
- Runtime verification: blocked by missing staging access
- Release decision: pending runtime proof
- Next step: run integration suite in staging and confirm observed behavior matches acceptance criteria

This structure is portable because it does not assume a specific toolchain, and it avoids falsely reporting a feature as fully done when only partial verification exists.

