Under strict TDD, the correct sequence is Red-Green-Refactor:

1. Red: write a minimal failing test for a valid email such as `user@example.com` and confirm it fails for the expected reason, not because of a typo or missing setup.
2. Green: implement the smallest possible `isValidEmail(email)` logic needed to make that single test pass.
3. Refactor: clean up naming or parsing logic while keeping the tests green.
4. Repeat with additional failing tests for invalid inputs like missing `@`, missing domain, empty string, whitespace-only input, and malformed addresses such as `user@` or `@example.com`.

Each test should follow Arrange-Act-Assert:

- Arrange: define the email input and expected boolean result.
- Act: call the validation function once.
- Assert: verify the returned value matches the expectation.

A solid TDD plan for this function is:

- First failing test: returns `true` for `user@example.com`
- Second failing test: returns `false` for `userexample.com`
- Third failing test: returns `false` for `user@`
- Fourth failing test: returns `false` for `@example.com`
- Fifth failing test: returns `false` for `""`

Important guardrail: do not write the full validator up front. Only add the minimum logic required to satisfy the current failing test, then iterate until the behavior is covered and coverage thresholds are met.

