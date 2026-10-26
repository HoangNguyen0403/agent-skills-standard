# Context Compaction

Use host-supported compaction or a bounded handoff packet; never assume an agent can mutate system prompts, memory, or prior history.

## Preserve

- Goal, deliverable, active bounded slice, in/out scope, and authority.
- Decisions and their approval/revision; blockers and current errors.
- Evidence links, artifact locations, and enough source facts to resume safely.
- Next action and owner.

## Compact Safely

- Compact only after required evidence and decisions are stored at stable references.
- Keep the goal, active slice, authority, acceptance criteria, open blockers and next action.
- Preserve the source revision and identifiers needed to resume or re-verify.
- Do not compress away required instruction bodies, approval records or verification receipts.
- Label anything dropped from the working set; retrieval must remain possible.
