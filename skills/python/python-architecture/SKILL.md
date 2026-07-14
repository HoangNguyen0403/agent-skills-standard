---
name: python-architecture
description: Structure Python backends with explicit dependency direction, ports/adapters, and runtime boundaries. Use when shaping project layout, clean architecture, service boundaries, dependency injection, report rendering boundaries, or transport separation in Python.
metadata:
  triggers:
    files:
      - "pyproject.toml"
      - "requirements.txt"
      - "**/*.py"
    keywords:
      - architecture
      - clean architecture
      - dependency injection
      - service boundary
      - render
      - transport
      - repository pattern
---

# Python Architecture

## **Priority: P0 (CRITICAL)**

## Rules

- Keep domain decisions independent from HTTP, DB, env, and queue clients.
- Define ports where callers need substitution; implement adapters at the edge.
- Compose runtime dependencies in startup or wiring modules.
- Treat contracts, policy, and normalization helpers as standalone modules.

## Recipe

1. **Place pure contracts and policy in domain/application modules**.
2. **Keep adapters thin**: DB, HTTP, bot, MCP, subprocess, storage.
3. **Push workflow orchestration into services** that call contracts and ports.
4. **Separate report formatting from fact gathering**.
5. **Add focused regression tests before moving boundary code**.

## Anti-Patterns

- **No fake clean architecture theatre**: folders must match real ownership.
- **No DB imports in domain policy**.
- **No startup wiring hidden in module globals**.
- **No one-function runtime blobs** spanning parse, dispatch, verify, and notify.

## References

- [Framework Map](../references/framework-map.md)
- [Clean Architecture](references/clean-architecture.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- inject
