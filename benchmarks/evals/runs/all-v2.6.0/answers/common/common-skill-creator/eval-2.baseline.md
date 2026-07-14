Audit the skill against four dimensions: activation, clarity, safety, and efficiency.

At 150 lines, first identify whether every section is actionable and whether repeated explanations can be consolidated. A long skill is not automatically wrong, but the default should be a compact core workflow with details moved to references or examples. Mark sections that are background, generic advice, duplicated rules, or unrelated to the skill’s trigger and outcome.

The 20-line code block deserves separate review. Keep it only if it is the smallest executable pattern that resolves a common ambiguity and is consistent with the skill’s required conventions. Otherwise replace it with a short pseudocode fragment, a schema/interface contract, or a reference to an example file. Check it for stale APIs, hidden assumptions, insecure defaults, missing error handling, and whether agents might copy it verbatim when it is intended only as illustration.

Test activation with positive examples, near-misses, and negative examples. The description should state the exact task, technology, and boundary conditions that activate the skill. Measure false positives as well as missed triggers; a broad description that fires on every adjacent task is not an improvement.

Check that the workflow has a clear start condition, ordered decisions, required inputs, verification steps, and completion criteria. Replace vague verbs such as “handle,” “consider,” or “ensure” with observable actions and evidence. Remove duplicated policy language and use one canonical rule with cross-references.

For safety, inspect instructions involving secrets, authentication, authorization, untrusted input, destructive commands, external systems, and generated code. Require least privilege, validation, safe defaults, explicit approval for irreversible operations, and tests that demonstrate isolation and failure behavior. Do not let example code normalize insecure shortcuts.

For efficiency, estimate how much of the skill an agent must load for common cases. Move lengthy reference material, full examples, and troubleshooting matrices out of the main body. Preserve the decision points and acceptance checks in the main skill. After editing, rerun a line-count check, trigger test set, lint/format checks, and representative task evaluations. Record the before/after findings and any behavior that remains intentionally unchanged.

