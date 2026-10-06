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

## Runtime-Managed Compaction & Externalization

In standard agent environments, conversation history is append-only. Compaction works through two primary mechanisms:

1. **Host-Managed Compaction**: When the host runtime supports session compression, it summarizes earlier conversation turns into a system context block while preserving the system prompt and recent active turns.
2. **State File Externalization**: The agent writes rolling state directly to an external file (e.g., `.agent/sdd/<slug>/progress.md` or `memory.md`). When context is fresh or compacted, the agent re-reads the structured state file rather than relying on hundreds of turns of conversational history.

**Crucial**: Always preserve the _Original User Goal_, _Active Files_, _Key Decisions_, and _Current Blockers_.
