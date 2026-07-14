# Refactor the deeply nested function

An 80-line function with five nesting levels is doing too much. Refactor it into a short orchestration function plus small, intention-revealing helpers. Preserve the existing behavior first; do not redesign domain rules while extracting code.

## Approach

1. Identify the function's input validation, decision logic, transformation, and side effects.
2. Move validation to guard clauses at the boundary.
3. Give each meaningful branch a named predicate or handler.
4. Keep the public function responsible only for orchestration; put persistence, I/O, and business rules behind injected dependencies.
5. Keep every function below 30 lines and remove comments that merely describe control flow. Retain comments only for non-obvious business reasons.

For example, a nested workflow can be reshaped like this:

```ts
type WorkflowRequest = {
  kind: string;
  payload: unknown;
};

type WorkflowResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: string };

type WorkflowDependencies = {
  isSupportedKind: (kind: string) => boolean;
  validatePayload: (payload: unknown) => boolean;
  execute: (request: WorkflowRequest) => unknown;
};

export function runWorkflow(
  request: WorkflowRequest | null,
  dependencies: WorkflowDependencies,
): WorkflowResult {
  if (!request) return { ok: false, reason: "request is required" };
  if (!dependencies.isSupportedKind(request.kind)) {
    return { ok: false, reason: "unsupported workflow kind" };
  }
  if (!dependencies.validatePayload(request.payload)) {
    return { ok: false, reason: "invalid workflow payload" };
  }

  return { ok: true, value: dependencies.execute(request) };
}
```

The actual predicates and `execute` implementation should be extracted from the original function, not invented. If the original function has several independent operations, split those operations into functions such as `validateRequest`, `selectWorkflowHandler`, and `persistWorkflowResult`. If new variants are expected, use a map of handlers or strategy objects so adding a variant does not require another long conditional chain (Open/Closed Principle).

Before declaring the refactor complete, compare old and new behavior for valid input, missing input, invalid input, every branch, dependency failures, and side-effect ordering. Add focused tests around the extracted helpers and one integration test for the orchestration function.


