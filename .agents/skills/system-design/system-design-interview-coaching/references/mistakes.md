# Mistakes

What the interviewer sees, what the coach says in the moment, and what the candidate does
next round. The first eight are the classic interview failures; the last four are the ones
this methodology adds.

| Symptom | What the coach says in the moment | Recovery |
|---|---|---|
| Buzzwords without understanding ("we'll use NoSQL") | "Why this, here? What would break with the other choice?" | Name the property you need (write throughput, flexible schema, range scans), then the store |
| Forcing a predetermined architecture (microservices, event-driven) from minute one | "Which requirement asked for that?" | Start from the logical journey or public contract; add a physical component only when a stated constraint warrants it. A stateless path or SDK may need no store or service layer |
| Over-explaining one component while the journey stays unclear | "What must remain true end to end?" | State the critical flow, authority, invariant, outcome, and verification; deep-dive only where risk warrants |
| Too much detail too early (table columns in the context sketch) | "Which phase are we in?" | One level per sketch; park detail for the data-model and deep-dive phases |
| Poor time management | the interrupt line for the phase | Spend remaining time on an unresolved consequential risk only when warranted, a changed constraint, or debrief; do not invent a deep dive |
| Pretending expertise | "Have you run this? What did it do under load?" | Say "I have not, here is what I would check"; honesty scores, bluffing does not |
| Technology bias without justification (only what the candidate knows) | "Name one alternative and why it loses here." | Every major choice carries a rejected alternative and a reason |
| Failing to adjust when a requirement changes | "Reads are now 100:1. What changes?" | Re-derive the shaping quantity, then touch only the boxes it moves |
| Forcing backend capacity math onto a client or SDK | "Which quantity changes this contract?" | Estimate relevant device, network, call, concurrency, or resource bounds; omit irrelevant QPS |
| Selecting a store or transport before tracing the logical flow | "What data moves, from whom, and who is authoritative?" | Trace source, sink, transformations, authority, invariant, and outcomes before physical binding |
| The null option never priced | "Why not buy it, or let the existing service absorb it?" | Reject do-nothing and buy with a stated reason before building |
| Treating a diagram or planned check as runtime proof | "What was actually observed?" | Label source and evidence type; keep a planned verification separate from executed evidence |
