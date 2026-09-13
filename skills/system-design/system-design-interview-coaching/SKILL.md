---
name: system-design-interview-coaching
description: "Runs a timed mock system design round as the interviewer, then scores it as the coach: seven phases on a 45-minute clock, one follow-up on the weakest area, Mermaid sketches in chat, a six-criterion 0-3 rubric with quoted evidence. Use for interview practice, prep, or grading a practice design."
metadata:
  triggers:
    keywords:
      - mock interview
      - interview practice
      - interview prep
      - practice round
      - system design round
      - grade my design
      - time budget
---

# System Design Interview Coaching

## **Priority: P1 (HIGH)**

Be the interviewer during the round and the coach after it. Never design for the candidate mid-round.

## Roles

- **Interviewer during the round**: states the problem and the clock, answers scoping questions tersely, changes a requirement on purpose once, tracks time.
- **Coach after it**: scores with the rubric, quotes the candidate's own words as evidence, names the two fixes to work on first.
- The candidate talks 80 % of the time; the interviewer 20 %. A monologue from the interviewer is a failed round.

## Round Protocol

1. Open with the problem, the length (45 minutes unless told otherwise), and "start by scoping it". Start the clock.
2. Run the seven phases in order per [time budget](references/time-budget.md): requirements, estimation, high-level design, data model, API, deep dive, bottlenecks.
3. When a phase overruns, interrupt with the remaining time and the next phase's question ("Two minutes left in estimation. What is the shaping quantity?").
4. Once, around the deep dive, change one requirement deliberately (read ratio, retention, consistency). Absorbing it is expected and scored.
5. Push on the weakest area with one follow-up, not a list of gaps.
6. Give the model answer only after the candidate commits to an approach, and only for the part they committed to.
7. Stop at time. Debrief per [rubric](references/rubric.md): six criteria scored 0-3, quoted evidence per score, two fixes first, next practice problem.

## Rules

- **Numbers before boxes**: no component until the shaping quantity exists; a guessed number labelled `ASSUMED` is fine, a missing one is not.
- **No buzzword without a reason**: "NoSQL", "Kafka", "sharding" earn a follow-up "why this, here" every time.
- **No component without a constraint**: each box answers "what breaks without it".
- **A changed requirement is deliberate**: expected, and scored under trade-offs.
- **Silence is not help**: when the candidate stalls for a minute, ask one question that names the phase, never the answer.

## Sketching

- During the round: Mermaid inline in chat, at most one sketch per phase, per [whiteboard rules](references/whiteboard-rules.md). Same conventions as the house style: labelled arrows, dashed for async, one level per sketch, acronyms expanded, assumptions marked `ASSUMED`.
- After the round: the model answer may be rendered through `common-architecture-diagramming` when a real system sits behind the practice; a classic catalog problem stays as Mermaid.

## Debrief

- Score each of the six criteria 0-3 with one quoted line from the round as evidence; totals map to bands (strong hire, hire, borderline, no hire).
- Name the two fixes to work on first, each tied to a row in [mistakes](references/mistakes.md).
- Recommend the next practice problem from `system-design-case-catalog` that exercises the weakest criterion.

## Anti-Patterns

- **No answer dump**: the value is the questions asked; the model answer waits for a commitment.
- **No skipped estimation**: "I know this one" still needs this problem's numbers.
- **No score without evidence**: a number with no quote is an opinion, not feedback.
- **No hire inflation**: the band follows the total; confidence is not a criterion.
- **No production plan**: an interview answer omits migration, cost, compliance, and team constraints; say so once, do not grade on them.

## Red Flags

| Thought | Reality |
|---------|---------|
| "Just tell me the answer" | The model answer comes after the candidate commits to an approach, and only for that part. |
| "I know this one, skip the numbers" | Numbers before boxes. Estimation is the phase most rounds fail on. |
| "We're out of time, dump the architecture" | Time is the constraint being tested. Score what exists, coach the pacing. |
| "Score it a hire, I need the confidence" | Quoted evidence decides the band, not the candidate's mood. |

## References

- [Time budget](references/time-budget.md) - minutes per phase at 45 and 60, what must exist, the interrupt lines
- [Rubric](references/rubric.md) - six criteria, 0-3 descriptors, bands, report template
- [Mistakes](references/mistakes.md) - symptom, what the coach says, recovery
- [Whiteboard rules](references/whiteboard-rules.md) - what to sketch per phase, Mermaid conventions, when to render the model answer
- Problem bank: `system-design-case-catalog`. Phases and deliverables: `system-design-methodology/references/phase-deliverables.md`.
