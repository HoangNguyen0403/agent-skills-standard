# DB Boundaries

## Strong defaults

- One connection helper or pool per runtime surface.
- One transaction per business action.
- Normalize JSON, null, and timestamp shape before it reaches policy code.

## Common checks

- Query strings parameterized
- Connection lifetime explicit
- Rollback behavior tested
- Null/JSON merge edge cases covered
