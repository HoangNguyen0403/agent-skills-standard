Start with a failing test that defines the expected behavior of `validateEmail`, then implement only enough logic to make that test pass, and finally refactor while keeping tests green.

A good TDD sequence is:

1. Write a small first test for one clearly valid address such as `user@example.com`.
2. Run the test suite and confirm the new test fails for the right reason.
3. Implement the minimum code needed for that case to pass.
4. Add more focused tests for important invalid cases, such as missing `@`, missing domain, extra spaces, or malformed local/domain parts.
5. After each new failing test, make the smallest safe implementation change to pass it.
6. Refactor only when behavior is protected by the tests.

The key point is that the implementation being “already written” does not change the TDD standard. The right move is still to express the behavior as tests first from the evaluator’s perspective, let those tests fail against missing or insufficient behavior, then converge on a green suite. Coverage is a side effect, not the goal. The goal is executable specification of valid and invalid email behavior.

