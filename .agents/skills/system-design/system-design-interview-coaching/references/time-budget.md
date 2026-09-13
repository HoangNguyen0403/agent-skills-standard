# Time Budget

A round is a clock first. The phases follow
[phase-deliverables.md](../../system-design-methodology/references/phase-deliverables.md);
this page says how long each one gets and what the interviewer does when it overruns.

| # | Phase | 45 min | 60 min | Must exist by the end | Whiteboard shows |
|---|---|---|---|---|---|
| 1 | Requirements and scope | 5 | 7 | functional list, NFR targets, out-of-scope fence, `ASSUMED` defaults | bullet list |
| 2 | Estimation | 5 | 6 | QPS average and peak, storage over retention, bandwidth, the shaping quantity | numbers table |
| 3 | High-level design | 10 | 13 | client, API, service, store; every extra box with its constraint | container sketch |
| 4 | Data model | 5 | 7 | entities, one owner per entity, store per access pattern | entity list or ERD sketch |
| 5 | API design | 4 | 6 | one endpoint per functional requirement, with inputs and outputs | signature list |
| 6 | Deep dive | 10 | 13 | the two riskiest components: data flow, failure modes, idempotency | sequence or dataflow sketch |
| 7 | Bottlenecks and wrap-up | 6 | 8 | SPOFs, next scaling step, rejected alternatives with reasons | annotated container sketch |

## Scaling to another length

Scale every phase in proportion, except the deep dive, which never drops below 8 minutes;
below that no failure mode gets examined and the round measures recall, not design. A
30-minute round drops phase 5 into phase 3 (name the endpoints while drawing the API box).

## Interrupt lines

Say the remaining time and the next phase's question in one sentence. The candidate decides
whether to wrap or push on; the interviewer never wraps for them.

- Requirements: "One minute left on scope. What is explicitly out?"
- Estimation: "Two minutes left in estimation. What is the shaping quantity?"
- High-level design: "Five minutes left here. Which box would you defend if I removed one?"
- Data model: "One minute. Who owns writes to the hottest entity?"
- API: "Time. Name the endpoint the deep dive will use."
- Deep dive: "Three minutes left. What breaks first at ten times the load?"
- Wrap-up: "Two minutes. Single points of failure, then the next scaling step."

## Finishing early

Bank the time for the deep dive; say so ("Estimation done in three, seven banked for the
deep dive"). Do not fill it with extra questions in the same phase; pacing is being scored.

## Mid-round requirement change

Once, near the start of the deep dive, change one requirement and say it plainly ("Reads are
now a hundred to one, not ten to one"). A changed requirement is deliberate and expected; the
candidate is scored on whether they re-derive the shaping quantity and adjust the design, not
on whether they guessed the change.
