# Rubric

Six criteria, each scored 0-3 with one quoted line from the round as evidence. Total out of
18. A score with no quote is an opinion, not feedback.

## Criteria and descriptors

| Criterion | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Requirements and scoping | drew boxes before asking anything | asked, but no out-of-scope fence or NFR targets | functional list, NFR targets, fence; assumptions unlabelled | all of that, with every unknown labelled `ASSUMED` and confirmed |
| Estimation | no numbers, or numbers after the design | numbers, but no peak, no storage, or off by 10x unnoticed | QPS peak, storage, bandwidth within an order of magnitude | that, plus named the shaping quantity and let it drive the design |
| Structure and time use | one phase ate the round | followed the phases, overran two of them | followed the phases inside the budget | followed the phases, banked time, spent it on the deep dive |
| Trade-offs | one option, no reasons | alternatives named, none rejected with a reason | each major choice has a rejected alternative and a reason | that, plus absorbed the changed requirement by re-deriving, not patching |
| Communication and collaboration | interviewer had to drive | talked 80 %, but answered questions with buzzwords | clear, checked in at phase boundaries, treated the interviewer as a teammate | that, plus corrected themselves when shown a gap |
| Depth on the defining constraint | never named it | named it late or vaguely | named it and designed around it | named it, sized it, and showed its failure mode in the deep dive |

## Bands

| Total | Band |
|---|---|
| 15-18 | strong hire |
| 12-14 | hire |
| 9-11 | borderline |
| 0-8 | no hire |

The band follows the total. Confidence, seniority, and effort are not criteria.

## Report template

```md
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

### Next practice problem
[catalog problem] — exercises [weakest criterion]
```
