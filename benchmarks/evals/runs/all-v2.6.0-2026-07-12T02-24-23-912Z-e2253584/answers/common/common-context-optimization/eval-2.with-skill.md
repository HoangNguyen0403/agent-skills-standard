Use a rolling-state compaction strategy. At 30 turns, the conversation has passed the skill's recommended compaction interval, so do not keep the full dialogue as the working context.

Create a compact project-state record containing:

```yaml
Current_State:
  Goal: "the original user goal, stated precisely"
  Active_Task: "what the agent is doing now"
  Status: "current progress or blocker"
  Key_Decisions: ["decisions that still constrain the solution"]
  Current_Errors: ["unresolved errors only"]
  Active_Files: ["files that matter to the current task"]
  Next_Steps: ["the next concrete actions"]
```

Summarize recursively instead of repeatedly appending summaries to the old transcript: summarize turns 1–5 into `State_A`, combine `State_A` with turns 6–10 into `State_B`, and continue in blocks. Discard the superseded dialogue and prior state after each successful compaction. Keep the original system prompt and the last three messages uncompressed so the governing instructions and immediate context remain exact.

The state should preserve facts and decisions, not conversation wording. Remove chit-chat, intermediate tool calls, and assumptions that were corrected. If a large tool result occurred, first extract its actionable facts and replace it with a semantic placeholder rather than carrying the raw output forward.

After compaction, continue with append-only history. Repeat compaction every 10 turns or about 8,000 tokens, and refresh the `Goal` and `Next_Steps` fields each time. This gives the agent a small, stable representation of intent and current work instead of relying on a long transcript that gradually buries the goal.

