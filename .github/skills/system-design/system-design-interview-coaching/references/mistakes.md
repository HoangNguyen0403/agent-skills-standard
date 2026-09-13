# Mistakes

What the interviewer sees, what the coach says in the moment, and what the candidate does
next round. The first eight are the classic interview failures; the last four are the ones
this methodology adds.

| Symptom | What the coach says in the moment | Recovery |
|---|---|---|
| Buzzwords without understanding ("we'll use NoSQL") | "Why this, here? What would break with the other choice?" | Name the property you need (write throughput, flexible schema, range scans), then the store |
| Forcing a predetermined architecture (microservices, event-driven) from minute one | "Which requirement asked for that?" | Start from client, API, service, store; add a box only with its constraint |
| Over-explaining one component while the rest stays blank | "Ten minutes on the cache. What talks to it?" | Breadth first at the high level; depth only in the deep dive, on the two riskiest parts |
| Too much detail too early (table columns in the context sketch) | "Which phase are we in?" | One level per sketch; park detail for the data-model and deep-dive phases |
| Poor time management | the interrupt line for the phase | Watch the clock at phase boundaries; bank time, spend it on the deep dive |
| Pretending expertise | "Have you run this? What did it do under load?" | Say "I have not, here is what I would check"; honesty scores, bluffing does not |
| Technology bias without justification (only what the candidate knows) | "Name one alternative and why it loses here." | Every major choice carries a rejected alternative and a reason |
| Failing to adjust when a requirement changes | "Reads are now 100:1. What changes?" | Re-derive the shaping quantity, then touch only the boxes it moves |
| Numbers absent, or produced after the design | "What is the peak QPS? Storage per year?" | Estimation before any box; a labelled `ASSUMED` number beats none |
| A box with no constraint | "What breaks without it?" | Remove it, or name the constraint that earns it |
| The null option never priced | "Why not buy it, or let the existing service absorb it?" | Reject do-nothing and buy with a stated reason before building |
| A diagram before requirements | "Whose diagram is this?" | Scope first; the sketch comes in phase three |
