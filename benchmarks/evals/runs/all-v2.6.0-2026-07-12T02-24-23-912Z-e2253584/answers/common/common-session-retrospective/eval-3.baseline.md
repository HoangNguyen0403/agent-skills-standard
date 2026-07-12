## Skills-library improvement plan

Start with a small evidence review of the session: list each correction, the skill that should have prevented it, whether that skill was activated, and whether its instructions were clear enough to follow. Separate failures into activation, instruction quality, execution, and verification.

Then make the smallest durable changes:

- Add missing keyword and file-pattern triggers where the correct skill was not activated.
- Strengthen the skill’s workflow with explicit preflight, scope, and completion gates.
- Add concrete examples for the failure modes observed, including negative examples that show when a rule does not apply.
- Add evaluation cases that reproduce each correction and assert observable behavior, not merely mention of the right concepts.
- Add cross-skill checks for conflicts, ordering, and duplicate guidance.
- Run the focused evaluations, inspect failures, and document any remaining gaps rather than tuning wording only to the existing prompts.

Prioritize changes that prevent high-impact errors such as insecure code, unauthorized external actions, or false completion claims. Keep the rules concise and reusable; avoid adding broad keywords that activate unrelated skills or create instruction overload. After validation, record the change, evidence, and regression coverage in the library’s normal changelog or learning record. A future retrospective should be able to trace each correction to a prevention rule and a test.

