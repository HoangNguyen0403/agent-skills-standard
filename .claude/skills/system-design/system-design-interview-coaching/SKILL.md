---
name: system-design-interview-coaching
description: "Facilitate timed system-design interview practice across backend, mobile/client, SDK/library, and full-stack surfaces. Use risk-driven probes, an adverse timeline, mechanism revision, one changed constraint, and the existing six-criterion evidence-based debrief."
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

Classify practice mode independently from depth and surface. Surface may be backend, mobile/client, SDK/library, or full stack; load the client skill only where applicable. The candidate designs; the interviewer probes and the coach scores after the round.

## Roles

- Interviewer: state the problem, clock, and "start by scoping it"; answer questions tersely, track time, introduce one changed constraint.
- Candidate: drive the design and talk about 80% of the time. Interviewer does not design for them mid-round.
- Coach: use the existing six-criterion rubric, quote evidence, and name two fixes first.

## Round Protocol

1. Agree the time limit and classify the surface. Retain the seven phases in [time budget](references/time-budget.md).
2. Scope journeys, boundaries, and quality scenarios; estimate only decision-relevant quantities. Do not require backend QPS for an SDK contract.
3. Have the candidate explain the logical critical flow before selecting physical components. Link a material flow to the canonical [flow contract](../system-design-data-architecture/references/flow-contracts.md); no repeated field checklist.
4. Select zero or more deep dives from risk and remaining time. Use an adverse timeline, ask for the invariant and mechanism/recovery, then change one material constraint and ask what must change.
5. Ask one follow-up on the weakest area. Give a model answer only after the candidate commits, and only for that part.
6. Stop at time. Debrief with the existing rubric; score explanation, invariant, mechanism, and adaptation, not number of technologies or diagrams.

## Surface and views

- Client/mobile: examine authority, pending versus confirmed state, lifecycle, offline need, and relevant device limits.
- SDK/library: examine public behavior, compatibility, cancellation/concurrency, resource bounds, host responsibility, and lifecycle.
- Backend/full stack: follow the named journey across relevant boundaries; do not require a separate component for every layer.
- Sketch only when it helps answer a question. A dataflow view explains movement/authority; sequence explains ordering/acknowledgment; state explains lifecycle. A table or prose is enough. No fixed sketch-per-phase rule.
- For a selected diagram, JSON is semantic source of truth; draw.io is editable presentation and image is an exported copy. During chat practice, use concise Mermaid only when it adds clarity.

## Rules

- No component before its constraint; no technology name without a reason.
- An unknown quantity is an explicit assumption, never a fabricated number. Distinguish estimate, target, and measured evidence.
- Planned checks and documents do not prove execution or operations.
- Keep the interview design scope appropriate; production migration, compliance, and operations details are not assumed unless the prompt makes them material.

## Debrief

- Score the unchanged six criteria 0-3 with a quoted line per score; follow [rubric](references/rubric.md).
- Name two prioritized fixes tied to [mistakes](references/mistakes.md). Recommend a next practice case only when useful; do not invent quotas.

## Anti-Patterns

- **No answer dump**: coach only after the candidate commits.
- **No forced topology**: no mandatory database, queue, cache, specialist count, or architecture layer.
- **No skipped learning loop**: present a concrete counterexample, require a mechanism revision, then test adaptation to the changed constraint.
- **No score without evidence**: the six existing criteria and quoted evidence remain the scoring contract.

## References

- [Time budget](references/time-budget.md) - pacing and interrupt guidance
- [Rubric](references/rubric.md) - six criteria, 0-3 descriptors, bands, report template
- [Mistakes](references/mistakes.md) - symptom, coaching prompt, recovery
- [Whiteboard rules](references/whiteboard-rules.md) - conditional view selection and semantics
- [Phase deliverables](../system-design-methodology/references/phase-deliverables.md)
