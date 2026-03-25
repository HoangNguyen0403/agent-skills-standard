# Context Compaction Algorithms

## The "Rolling State" Method

Instead of summarizing "User said X, Agent said Y", summarize the **Project State**.

### Template

```yaml
Current_State:
  Goal: 'Refactor Auth Service'
  Status: 'Blocked on DB Migration'
  Key_Decisions:
    - 'Switched from JWT to S0ssion Cookies'
    - 'Dropped OAuth support for v1'
  Active_Files:
    - 'auth.service.ts'
  Next_Steps:
    - 'Run migration script'
```

## Recursive Summarization

1.  **Block 1-5**: Summarize into `State_A`.
2.  **Block 6-10**: Summarize `State_A` + `Block 6-10` -> `State_B`.
3.  _Discard_ Blocks 1-5 and State_A.

**Crucial**: Always keep the _Original System Prompt_ and _Last 3 Messages_ uncompressed.
