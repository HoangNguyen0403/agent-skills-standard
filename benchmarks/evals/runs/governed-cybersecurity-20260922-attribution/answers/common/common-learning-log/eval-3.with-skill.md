Assumption: `AGENTS_LEARNING.md` exists at the project root; replace `N` with its current iteration count.

Append one entry before retrying:

```markdown
## Agent Learning Log: Iteration #(N+1)

- Trigger: Session retrospective
- Scope: session
- Mistake: Missed loading the applicable security skill before writing an API endpoint, violating the Pre-write skill-loading requirement.
- Better Approach: Before editing an API endpoint, resolve and load the applicable security skill, then perform the security review and implementation.
- Candidate status: proposed
- Candidate ID: security-skill-prewrite-check
- Provenance: Session retrospective; evidence: missed security-skill load for API endpoint
- Approval: none
- Rollback version: none
```

Operation: `AGENTSLEARNING,append` to `AGENTS_LEARNING.md`. Then load the security skill and retry the endpoint correction.
