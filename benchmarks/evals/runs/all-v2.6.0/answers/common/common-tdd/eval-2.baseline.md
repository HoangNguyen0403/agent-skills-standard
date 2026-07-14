Use TDD to specify the order service behavior one scenario at a time instead of writing a large batch of tests after the fact.

A solid approach is:

1. Write the happy-path test first, describing a successful order flow with valid input and expected output or side effects.
2. Run it, confirm it fails, then implement the smallest behavior needed to pass.
3. Add one failing error-path test at a time for the three distinct failure scenarios.
4. After each failing test, make the minimal change necessary to satisfy only that scenario without breaking earlier tests.
5. Refactor shared setup, duplication, or naming only after all tests are green.

The value of the test set is not just branch coverage. It should clearly document the service contract:

- what valid input produces,
- what dependencies are called,
- what errors are raised or returned,
- and what must not happen on failure.

So the answer is not “write enough tests to cover four branches.” The better baseline is “grow the implementation through four precise failing examples: one success case and three meaningful failures.”

