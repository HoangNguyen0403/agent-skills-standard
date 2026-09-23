Assumption: `AGENTS_LEARNING.md` already exists with `N` iteration headers. Append this entry at the bottom:

```markdown
## Agent Learning Log: Iteration #(N+1)

- Trigger: Session retrospective
- Scope: session
- Candidate status: proposed
- Mistake: Wrote an API endpoint without loading the applicable security skill.
- Evidence: Session retrospective finding.
- Better Approach: Before the pre-write step for any API endpoint, load the applicable security skill, verify it is active, then write or retry the endpoint.
- Provenance: Source revision: current session; evidence reference: session retrospective; candidate ID: security-skill-api-endpoint.
- Approval: None.
- Rollback version: None.
```

This is an append-only update to `AGENTS_LEARNING.md`; do not overwrite prior `Iteration` entries.
