---
description: "Draft user-facing release notes, store changelogs, and internal publish summaries."
---

# Publish Notes Workflow

Goal: Convert verified changes into accurate user-facing and internal release notes.

## Steps

1. Gather inputs:
   - Merged commits or diff
   - PR description
   - Verification report
   - Deployment report
   - Product or store constraints

2. Triage impact:
   - User-facing change
   - Bug fix
   - Security or privacy note
   - Operational change
   - No-user-impact internal change

3. Draft notes:
   - Use plain language.
   - Mention outcomes, not implementation details.
   - Keep sensitive security details high level.
   - Respect platform character limits.

4. Verify:
   - Cross-check against shipped scope.
   - Remove unshipped claims.
   - Route lessons to `retro-learn`.

## Output Template

```md
# Release Notes: [Version]

## Public Notes

## Internal Notes

## Security Or Privacy Notes

## Verification Source

## Next Workflow
retro-learn
```
