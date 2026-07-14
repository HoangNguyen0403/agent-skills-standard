The workflow should be tightened by removing explanation paragraphs before each step and converting them into brief labels, criteria, or notes inside the step itself.

Why this matters:

- Long explanations slow down scanning.
- Workflows are usually used during execution, so readers need fast navigation.
- The “why” should appear only when it changes a decision or prevents a common mistake.

A better pattern is:

1. Define scope
   - PR link
   - acceptance criteria
   - review focus

2. Inspect implementation
   - correctness
   - edge cases
   - error handling

3. Check tests
   - coverage for changed behavior
   - missing regression tests

4. Record findings
   - blockers
   - non-blocking suggestions
   - final recommendation

If extra context is truly necessary, keep it to one short note under the relevant step rather than a paragraph before the step. Example:

- Note: escalate security-sensitive findings even if the functional change is small.

In short, workflow writing should optimize for fast execution, low token cost, and high signal density. Explanation should be compressed unless it is essential for safe use.

