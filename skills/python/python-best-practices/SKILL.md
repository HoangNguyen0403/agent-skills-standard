---
name: python-best-practices
description: Write maintainable Python with small functions, explicit boundaries, guard clauses, and readable state flow. Use when refactoring Python services, helpers, modules, or async logic for clarity—not generic test writing, tooling setup, or database transaction implementation.
metadata:
  triggers:
    files:
      - "**/*.py"
    keywords:
      - refactor
      - clean code
      - readability
      - guard clause
      - composition
---

# Python Best Practices

## **Priority: P1 (HIGH)**

## Rules

- Prefer small focused functions over long stateful procedures.
- Push parsing, formatting, transport, and persistence into separate helpers.
- Return early on invalid or terminal states.
- Pass collaborators in; do not hide them behind globals or import-time singletons.
- Keep naming literal and domain-specific.

## Recipe

1. **Split orchestration from transformation**.
2. **Extract repeated shape cleanup** into one helper.
3. **Keep side effects at edges** and pure decisions in the middle.
4. **Use fakes in tests** instead of patching deep internal chains when possible.

## Anti-Patterns

- **No god functions**: break report builders and workflow loops into tested slices.
- **No boolean soup**: name decision helpers instead of stacking flags inline.
- **No hidden retries**: surface retry policy near the call site.
- **No print-debugging in shared runtime code**: use structured logging or test assertions.

## References

- [Framework Map](../references/framework-map.md)
