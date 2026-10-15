# Rubric

Six criteria, each scored 0-3 with one quoted line from the round as evidence. Total out of
18. A score with no quote is an opinion, not feedback.

## Criteria and descriptors

| Criterion | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Requirements and scoping | drew boxes before asking anything | asked, but no journey or quality target | relevant journeys, quality scenario, scope and assumptions | also surfaced material ownership/trust boundaries and evidence gaps |
| Estimation | invented irrelevant numbers or designed before estimates | relevant quantities, but key shaping factor absent | applicable estimates and assumptions, with shaping quantity | provenance is clear and estimates shape only decisions they affect |
| Structure and time use | one phase ate the round | followed phases but missed a material risk or adaptation | paced the session and examined a relevant risk | adapted pacing to surface/time and used a counterexample to improve the design |
| Trade-offs | one option, no reasons | alternatives named, none rejected with a reason | major choices have a rejected alternative and reason | revised the affected mechanism after an adverse timeline or changed constraint |
| Communication and collaboration | interviewer had to drive | talked 80 %, but answered questions with buzzwords | clear, checked in at phase boundaries, treated interviewer as teammate | corrected reasoning when evidence exposed a gap |
| Depth on the defining constraint | never named it | named it late or vaguely | named it and designed around it | traced the relevant invariant, failure behavior, and verification |

## Bands

| Total | Band |
|---|---|
| 15-18 | strong hire |
| 12-14 | hire |
| 9-11 | borderline |
| 0-8 | no hire |

The band follows the total. Confidence, seniority, and effort are not criteria.

## Design and Flow Evidence

- Initial commitment: [candidate's chosen design and constraint]
- Critical flow: [`FLOW-*` linked to `REQ-* -> HLD-* -> CMP-* -> LLD-* -> VER-*` with an observable `VER-*` condition, or scope-justified `N/A`]; see canonical [C1 flow contract](../../system-design-data-architecture/references/flow-contracts.md), not a duplicate checklist.
- Counterexample/adverse timeline: [event and user-visible failure or uncertainty]
- Mechanism revision: [changed mechanism, preserved invariant, expected outcome]
- Changed constraint: [what changed and how the candidate re-evaluated the decision]
- Verification and gaps: [observable pass/fail condition; distinguish proposed from exercised evidence; remaining owner/invariant/evidence decisions]

## Interview Scorecard: [problem], [length] minutes

| Criterion | Score | Quoted evidence | Note |
| --- | --- | --- | --- |
| Requirements and scoping | n/3 | "..." | |
| Estimation | n/3 | "..." | |
| Structure and time use | n/3 | "..." | |
| Trade-offs | n/3 | "..." | |
| Communication and collaboration | n/3 | "..." | |
| Depth on the defining constraint | n/3 | "..." | |

**Total**: n/18 — [band]

### Two fixes to work on first

1. [mistake row from mistakes.md] — [what to do differently next round]
2. ...

### Next practice problem (optional)

Include only when useful: [catalog problem] — exercises [weakest criterion]
