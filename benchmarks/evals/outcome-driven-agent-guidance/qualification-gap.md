# Qualification adapter decision proposal

Status: design proposal only; no adapter implementation or trial execution authorized.

## Question

How should this pilot compare old and new multi-file guidance with actual task actions while retaining truthful, immutable evidence?

## Recommendation

Add a pilot-scoped adapter only after approval; leave the ordinary skill-eval arm protocol and existing L3 runtime unchanged. An adapter must consume frozen guidance bundle bytes, not just one SKILL.md. The existing prompt-only arm cannot be called current guidance.

## Required contract before implementation

- Input: frozen current/candidate file manifests, identical task inputs and fixture identities, independently fixed expected outcomes, exact eligible model/profile and effort, repetition/order schedule, approved resource cap.
- Isolation: separate owned disposable task workspaces/contexts per trial; no production credentials, external publication capability, or writable access to source evidence/oracles. Actual host enforcement must be identified; instructions alone are not confinement.
- Actions: use existing authorized host interfaces where their logs and enforcement can be verified; refuse execution when required action capture or isolation is unavailable. Do not simulate a tool trace with generated text.
- Observation: actual loaded bundle identity, task workspace diff/outward effects, performed commands/results, clarification and correction events, resource usage with unknown fields explicit.
- Output: immutable trial receipts and complete attempt inventory; invalid infrastructure attempts stay visible; rubric verdicts bind to criterion, input, model configuration, and action evidence.
- Safety cases: attempted unauthorized effects must be observable and prevented at the host boundary; an absence of text is not proof an action did not happen.
- Promotion: apply the approved plan's precommitted thresholds only; technical source checks cannot substitute for comparison.

## Decision boundaries

No new evaluator schema, public API, host approval setting, model route, or L3 runtime changes are implied. Engineering must inspect exact existing extension points and propose a bounded file/interface delta before coding. Independent security/architecture review is required for execution confinement and evidence authority. Do not invent a live hypervisor or claim existing refusal-only L3 hooks execute tasks.

## Alternatives

1. Keep candidate branch-only and defer qualification: no runtime extension or evaluation spend; cannot distribute or claim efficacy under this plan.
2. Approved bounded adapter: enables the intended experiment if host isolation and evidence capture are available; increases implementation/review scope and requires explicit authorization.

Default until decision: alternative 1. Continue independently approved canonical candidate and deterministic routing work; no generation/copyback or activation.

## Approval needed

Approve a bounded adapter design effort (not unrestricted runtime work), identify the eligible evaluation configuration, and set a maximum spend/concurrency. Exact monetary estimate is unavailable until provider rates and supported trial execution are established. Missing rates are not zero cost.
