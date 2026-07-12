Before marking a task complete, check all of the following:

1. Scope: the implementation matches the requested behavior and acceptance criteria, with no unapproved scope expansion.
2. Evidence: each requirement has a corresponding inspection, test, or runtime result; assumptions are clearly identified.
3. Quality: changed code is readable, consistent with local conventions, and free of obvious correctness, security, performance, and maintainability problems.
4. Verification: relevant unit, integration, end-to-end, lint, type, build, and migration checks have run as applicable, and their actual results are understood.
5. Regression safety: existing behavior, failure paths, permissions, compatibility, and boundary cases were considered.
6. Deliverable state: the diff contains only intended changes, required tests/docs/configuration are present, and generated artifacts are handled correctly.
7. Handoff: summarize what changed, what was verified, any known limitations, and the exact commands or evidence others can reproduce.

Do not use “done” to mean merely “the edit was made.” Use it only when the required behavior is implemented and the available evidence supports the completion claim.

