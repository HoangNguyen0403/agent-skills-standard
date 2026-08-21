# Implementation Examples

## Parameterized Query (TypeScript)

```typescript
// Parameterized query — prevents SQL injection
const user = await db.query(
  'SELECT * FROM users WHERE email = $1 AND status = $2',
  [email, 'active']
);
```

## Secret Management (Python)

```python
# Secret management — never hardcode credentials
import os
API_KEY = os.environ["API_KEY"]  # Good: from environment
# API_KEY = "sk-abc123"          # Bad: hardcoded secret
```
