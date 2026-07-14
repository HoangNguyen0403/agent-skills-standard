Start by protecting the current behavior with characterization tests, especially for error paths and deeply nested conditions. Then refactor in small, reviewable steps:

1. Replace branches that reject or exit early with guard clauses. This removes the outer levels of indentation and makes the main path visible.
2. Extract cohesive blocks into small functions with intention-revealing names. Each function should answer one question or perform one responsibility.
3. Separate decision-making from side effects. For example, calculate whether an operation is allowed before performing I/O, persistence, or notifications.
4. Replace complex boolean expressions with named predicates, and use a `switch` or a strategy/polymorphic design when behavior varies by type or state.
5. Keep the refactored function's inputs, outputs, exceptions, logging, and ordering compatible unless a behavior change is explicitly intended.

A typical shape is:

```text
function execute(request):
    if request is missing: return invalidRequest()
    if not isAuthorized(request): return forbidden()

    context = buildContext(request)
    if not isValid(context): return invalidContext()

    result = performOperation(context)
    return formatResult(result)
```

The exact extraction boundaries should follow domain responsibilities rather than an arbitrary line count. Aim for shallow control flow and functions that are easy to name and test independently. Run the existing tests after each step, then add focused tests for each extracted branch and an end-to-end test for the original behavior. Avoid merely moving the same 80 lines into several functions; the goal is reduced responsibility and cognitive load, not just smaller files.

