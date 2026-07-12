## Session retrospective

Three user corrections indicate a repeatable process failure rather than isolated mistakes. I would record each correction as an evidence-backed entry with: the original expectation, what I did, the observed failure, the likely cause, and the prevention rule.

1. **Missed instruction or scope boundary:** identify the exact instruction that was overlooked, whether it was available before execution, and add a preflight check that confirms applicable instructions before changing files or taking external action.
2. **Insufficient verification:** compare the claimed result with the actual command output, tests, or runtime state. Add an explicit completion gate requiring reproducible evidence before reporting success.
3. **Poor communication or wrong handoff:** capture where the response diverged from the requested format, level of detail, or decision boundary. Add a response checklist covering assumptions, blockers, changed files, and validation status.

The corrections should then be grouped by root cause—activation, execution, verification, or communication—so the library receives one durable improvement instead of three redundant patches. For each proposed change, define a trigger, the required behavior, an observable success condition, and a regression example. Run the relevant evaluation prompts afterward and retain the results. If the same failure recurs, update the workflow or skill directly; if it is a one-off ambiguity, improve the prompt or documentation rather than adding a broad rule.

The retrospective should not rewrite history or claim a fix without evidence. It should produce a short learning record, prioritized library changes, regression tests, and an owner/next action for any unresolved item.

