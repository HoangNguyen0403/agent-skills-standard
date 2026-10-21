# Time Budget

A round is a clock first. The phases follow
[phase-deliverables.md](../../system-design-methodology/references/phase-deliverables.md);
this page says how long each one gets and what the interviewer does when it overruns.

| # | Phase | 45 min | 60 min | Evidence by the end | Board, only if useful |
|---|---|---|---|---|---|
| 1 | Requirements and scope | 5 | 7 | Journeys, quality scenarios, scope, relevant boundaries and assumptions | Bullets |
| 2 | Estimation | 5 | 6 | Applicable estimates, provenance, shaping quantity; omit irrelevant quantities | Numbers/table |
| 3 | High-level design | 10 | 13 | Logical flow before physical choices; components justified by constraints | Selected context/container or prose |
| 4 | Data model / authority | 5 | 7 | Relevant data, authority, copies, lifecycle; SDK may focus on contract/state | Entity/owner list or selected ERD/state |
| 5 | API / client contract | 4 | 6 | Relevant endpoint or public API behavior and outcomes | Signatures/table |
| 6 | Risk-driven deep dive | 10 | 13 | Zero or more consequential risks; adverse timeline, invariant, mechanism, recovery, verification | Selected sequence/dataflow/state or prose |
| 7 | Bottlenecks and wrap-up | 6 | 8 | Changed-constraint adaptation, unresolved risks, rejected options and next step | Update selected view only |

Times are a pacing guide, not a quota. Redistribute phases for the stated duration and surface; examine a consequential risk if one exists. If none warrants a deep dive, use time for clarification or debrief rather than inventing one.

## Scaling to another length

Scale phases to the agreed duration and task. Below 30 minutes, combine API/client contract with high-level design and select a single material risk only if one warrants it. Never require two components, two deep dives, or a sketch per phase.

## Interrupt lines

Say remaining time and ask the candidate to choose what to finish. Example: "Two minutes remain. Which invariant or decision still needs evidence?" Do not complete the candidate's answer.

## Finishing early

Bank time for an unresolved consequential risk, changed constraint, or debrief. Do not fill it with extra questions or invented architecture.

## Mid-round requirement change

Introduce one material change when the candidate has a committed design. Ask what assumption, quantity, invariant, or mechanism it affects. Score re-derivation and targeted revision, not anticipation of the change.

