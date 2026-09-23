Assumption: “route handler” should trigger the existing skill/workflow for request routing, without changing its scope.

Change the canonical skill source’s trigger/keyword map to include the exact phrase `route handler` (including the repository’s normal case and word-boundary matching rules). Add regression coverage showing:

- `route handler` triggers the intended skill.
- Existing triggers still resolve unchanged.
- Similar but unrelated terms do not trigger it unexpectedly.
- Documentation/indexes and generated artifacts remain synchronized.
- The diff, test results, and any scan/validation output are recorded for auditability.

The proposing agent must not approve its own patch. Promotion requires an independent reviewer or maintainer to verify the diff, run the relevant validation, confirm the trigger behavior and scope, and explicitly approve it. If no independent approver is available, the patch may be prepared and tested but must not be promoted.
