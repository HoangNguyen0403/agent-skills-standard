# Four-Phase Process

Classify mode, depth, and surface independently. A full session advances only when its phase exit predicate is confirmed. A quick sketch may proceed with explicit assumptions, but unresolved material decisions prevent a readiness claim.

## Phase 0 - Classify

- Output: mode (new design | review existing | interview practice), depth (quick | full), and surface (backend | mobile/client | SDK/library | full stack); mixed systems may name multiple surfaces.
- Full-session exit: confirm classification and load only relevant siblings/views. Quick sketches label defaults and escalate when a hard constraint or irreversible decision appears.

## Phase 1 - Intake

- Output: bounded journeys, functional needs, quality scenarios (trigger, environment, response, measurable condition, owner), scope fence, trust/ownership boundaries, assumptions, and evidence gaps.
- Full-session exit: user confirms material requirements and scope. Record unresolved material owner/invariant, compliance/residency, or topology-changing budget decisions in existing `decision_needed`; do not commit the affected design or claim readiness until resolved.
- Ask no more than 3 blocking questions per turn. Review-existing maps current components, owners, traffic, incidents, and binding constraint first. SDK/client prompts remain surface-specific.

## Phase 2 - Estimate

- Output only decision-relevant estimates, marked target, estimated, or measured with provenance; name the shaping quantity. Do not force QPS or invent quantities for client/SDK work.
- Full-session exit: user confirms applicable shaping estimates and order of magnitude before physical component selection. If a material input or topology-changing budget remains undecided, record it and hold that decision/readiness. Quick sketches may proceed only with labeled assumptions.

## Phase 3 - Logical Flow and Physical Design

- Trace the critical journey logically before choosing technology: source/sink, data/purpose, transformations, authoritative owner/derived copies, invariant, user outcomes, and observable verification. Use the canonical [critical-flow contract](../../system-design-data-architecture/references/flow-contracts.md).
- Bind accepted decisions to physical components, stores, and contracts afterward. Link applicable `FLOW-*` records to `REQ-* -> HLD-* -> CMP-* -> LLD-* -> VER-*`; `FLOW-*` is not an outcome field. Choose views only for named questions; prose/table is sufficient.
- Full-session exit: user accepts the component/contract decisions and material flow owners/invariants are resolved. Unresolved owner, invariant, compliance/residency, or topology-changing budget decisions hold the affected design and readiness. Never hide them as harmless assumptions.

## Phase 4 - Risk, Review, and Handoff

- Select zero or more deep dives by consequential risk, surface, and time. For selected risks, examine an adverse timeline, invariant, mechanism/recovery, and verification; in practice require counterexample -> revision -> changed constraint -> evidence-based debrief.
- Full-session exit: run the declared-profile, scope-aware nine-axis scorecard and independent [semantic evaluator](../../system-design-review/references/semantic-evaluation.md). Use the scorecard's applicable-axis denominator and justified `N/A`; semantic soundness requires at least 85%, no applicable zero, and no hard failure. A failed material gate or unresolved material decision blocks readiness. Agree a scope-appropriate scorecard threshold before claiming readiness.
- Preserve existing outcome fields and status values. Put unresolved evidence/decisions in `missing_evidence`/`decision_needed`; a quick sketch with assumptions is not a readiness verdict. Documents/planned checks do not prove implementation or operations.
## Session Outputs

| Artifact | When produced | Consumer |
| --- | --- | --- |
| Journeys, quality scenarios, scope, assumptions | Intake | Design record, downstream requirements |
| Relevant estimates and shaping quantity | Estimate | Component and cost decisions |
| Critical-flow record or canonical pointer, linked to `REQ-* -> HLD-* -> CMP-* -> LLD-* -> VER-*` | Logical design / LLD | Design record and verification |
| Physical component/ownership map | After logical flow | HLD, implementation planning |
| Selected views, only for named questions | As needed | Decision and review |
| Adverse timeline, recovery, changed-constraint revision | Risk review / practice | Readiness, learning |
| Staged plan, scorecard, risk register | Handoff | Roadmap and next workflow |
