The correct TDD response is to resist “tests later” pressure and restore the red-green-refactor loop.

If code was written before tests, the next best recovery is:

1. Pause further implementation.
2. Write a failing test that captures the intended behavior or current bug.
3. If the existing code already passes, tighten the test until it meaningfully proves the behavior rather than merely executing the code.
4. Use that test suite as the guardrail for any remaining changes.
5. Continue in small red-green-refactor steps from that point onward.

What should not happen is treating tests as cleanup work added only for coverage after the implementation is “done.” That turns tests into documentation of code shape instead of specification of behavior.

TDD is primarily about feedback and design control:

- red: define the next behavior with a failing test,
- green: satisfy it with the smallest implementation,
- refactor: improve structure without changing behavior.

So even when someone says “just add tests after and move on,” the baseline answer is to reintroduce a behavior-first failing test immediately and use it to drive the fix to completion.

