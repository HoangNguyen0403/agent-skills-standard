# Output Projection and Artifact References

## Project After Consumption

1. Read the output needed to make the current decision.
2. Retain concrete findings, errors, decisions, and values required downstream.
3. Replace repeated raw output in the working packet with a concise summary and stable artifact reference.
4. Preserve the original artifact and its revision; do not claim the agent rewrote history or erased prior context.

## Failure Records

Keep each distinct failure and its cause. Group repeated identical failures only when count, timing, and diagnostic details remain recoverable.

## Example

**Unfiltered Command (Avoid)**:
```text
Finding: 3 matching users; oldest created 2024-01-15.
Source: artifact://run-42/users.json (unchanged)
```
