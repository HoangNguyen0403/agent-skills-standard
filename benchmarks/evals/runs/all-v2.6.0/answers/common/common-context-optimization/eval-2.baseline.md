Use a rolling, explicit state summary instead of relying on the full 30-turn transcript. Maintain a small goal contract near the active context with:

- the one-sentence objective and success criteria;
- scope, constraints, and non-goals;
- decisions already made and their rationale;
- verified facts and their sources;
- open questions, risks, and assumptions; and
- the next concrete action.

After each meaningful milestone, update that summary and mark which items are current. Keep detailed evidence in referenced artifacts or targeted excerpts, not in the working prompt. Compress old turns into this state and discard repetitive tool output, abandoned approaches, and superseded plans. Preserve exact identifiers, commands, error messages, and file locations when they are required to continue the work.

At the start of each new turn or tool call, check the request against the goal contract. If new information changes the plan, explicitly record the change and why; otherwise do not let the latest conversational detail redefine the objective. A useful checkpoint format is: Goal, Done, Evidence, Decisions, Open, Next. Periodically test the summary by asking whether it still states the original success condition and whether the proposed next step advances it. This gives the agent a stable source of truth while keeping the active context small.

