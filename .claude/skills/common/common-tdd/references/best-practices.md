# TDD Best Practices

Extracted from industry standards (Graphite, dev.to, et al.).

## 1. F.I.R.S.T. Principles

- **F**ast: Tests should run quickly. Slow tests discourage frequent running.
- **I**solated/Independent: Tests should not depend on each other or external state (DB, Network).
- **R**epeatable: Run it 1,000 times, get the same result.
- **S**elf-Validating: The test output is boolean (Pass/Fail). No manual inspection needed.
- **T**horough: Test distinct contract rules, boundaries, and plausible faults; do not enumerate low-signal combinations.

## 2. Arrange-Act-Assert (AAA)

Structure every test clearly:

1.  **Arrange**: Set up the state, inputs, and mocks.
2.  **Act**: Call the method/function under test.
3.  **Assert**: Verify the result or side effects.

## 3. The "Three Laws" of TDD

1.  You are not allowed to write any production code unless it is to make a failing unit test pass.
2.  You are not allowed to write any more of a unit test than is sufficient to fail; and compilation failures are failures.
3.  You are not allowed to write any more production code than is sufficient to pass the one failing unit test.

## 4. Testing Philosophy

- **Test Behavior, Not Implementation**: Refactoring should not break tests.
- **Positive & Negative**: Test success and failure contracts when each represents a distinct risk.
- **One Logical Behavior**: Keep one behavior per test; multiple assertions may prove that behavior and its required side effect.
- **Project-Owned Coverage**: Use repository-configured thresholds when present. Never pad tests to reach a universal percentage.

## 5. When NOT to TDD

- UI Tweaks (CSS modifications, color changes).
- Exploratory prototyping (throwaway code).

## 6. TDD vs BDD (Behavior-Driven Development)

- **TDD**: Starts at the smallest honest layer: use a unit for pure owned behavior, and a broader contract/integration layer when the behavior crosses components.
- **BDD**: Focuses on system behavior from a user's perspective. "Given I am logged in, When I check out, Then my order is placed."
- _Tip_: Use TDD for internal logic and BDD (often with tools like Cucumber or Gherkin syntax) for high-level user flows.
