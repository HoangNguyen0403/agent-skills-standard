# Implementation Examples

## Observation Masking

```text
# Before (wastes ~800 tokens):
[tool_output]: { ... 200 lines of JSON ... }

# After masking (~30 tokens):
[Reference: 3 users matched filter; oldest created 2024-01-15]
```

## Compacted State

```text
# Compacted state example:
Goal: Fix auth timeout | Task: Retry logic in AuthService
Decisions: Use exponential backoff (max 3 retries)
Errors: 401 on token refresh after 30s idle
```
