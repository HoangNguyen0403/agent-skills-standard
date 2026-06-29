---
name: python-database
description: Implement Python database access with parameterized SQL, transaction scope, connection helpers, and repository seams. Use when editing Postgres queries, repositories, transactions, pooling, or persistence boundaries in Python.
metadata:
  triggers:
    files:
      - "**/repository/**/*.py"
      - "**/repositories/**/*.py"
      - "alembic.ini"
    keywords:
      - postgres
      - psycopg2
      - sqlalchemy
      - transaction
      - repository
      - sql
---

# Python Database

## **Priority: P1 (HIGH)**

## Rules

- Parameterize every query; never interpolate user or runtime data into SQL strings.
- Keep connection and transaction ownership explicit.
- Hide storage shape behind repository or query helpers when business logic depends on it.
- Normalize JSON and null handling at the persistence boundary.

## Recipe

1. **Open connections through one helper or pool abstraction**.
2. **Use context managers** for connection and transaction lifetime.
3. **Keep one business action in one transaction**.
4. **Return typed rows or normalized dicts**, not raw cursor tuples leaking everywhere.
5. **Test malformed/null metadata paths** when patching JSON payloads.

## Anti-Patterns

- **No f-string SQL**.
- **No transaction split-brain** across handler, service, and repo.
- **No unbounded connection churn** in loops.
- **No DB truth hidden behind report formatting code**.

## References

- [Framework Map](../references/framework-map.md)
- [DB Boundaries](references/db-boundaries.md)
