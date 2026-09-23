# Semantic Evaluation Rubric

## Purpose and limits

This rubric is the independent behavioral check for the system-design and architecture-diagram evals. It is not another scorer and it does not add an assertion type.

The repository scorer supports only `contains`, `contains_any`, `not_contains`, `regex`, and `file_reference`. Those checks are lexical smoke signals:

- `contains` and `contains_any` check wording or one accepted wording variant.
- `not_contains` checks that a literal does not occur; it cannot tell whether a recommendation is actually rejected.
- `regex` can smoke-check that inputs, units, and an approximate result are present, but it cannot prove arithmetic, causality, or a safe mechanism.
- `file_reference` checks that a path or basename is mentioned, not that the referenced evidence was used.

A passing generated case is therefore not semantic proof. The grader below reads the prompt, answer, and expected outcome independently. It must not award soundness because an answer repeats the vocabulary in the skill or eval definition.

## Independent grading protocol

1. Read the case prompt and list the requested facts, numbers, constraints, audience, and decision.
2. Read the answer without comparing it to the source wording. Extract its assumptions, calculations, components, mechanisms, invariants, failure outcomes, exclusions, and evidence claims.
3. Recompute every requested quantity with the prompt's inputs. Accept ordinary rounding and equivalent units; reject a result that changes the order of magnitude, drops a multiplier, or hides a unit.
4. For every component or diagram element, identify the constraint, question, or audience decision it serves. A named technology without that link is not a justified choice.
5. Simulate the stated failure or changed-constraint variant. Check that the answer's behavior, invariant, recovery, and view routing still fit the new condition.
6. Apply the hard-failure rules. Then score the dimensions below and record concrete evidence from the answer, not merely keywords.

## Dimensions

Score each applicable dimension 0, 1, or 2. `0` is absent, contradictory, or unsupported; `1` is partly concrete but incomplete; `2` is concrete and consistent with the prompt. Mark a dimension `N/A` only when the prompt does not request it; do not award its points.

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Scope and assumptions | Silent or invented assumptions; ignores audience or scope | States some assumptions but leaves a design-shaping one implicit | States the decision, scope, depth, and every design-shaping assumption |
| Quantitative coherence | Missing, wrong, or unitless calculation | Correct direction but incomplete formula, units, or peak/retention treatment | Recomputes the requested values, shows the formula, units, rounding, and design consequence |
| Mechanism and outcome | Technology list or slogan | Mechanism is named but its causal effect is vague | Mechanism is tied to the constraint and describes the observable outcome |
| Invariant and failure behavior | No invariant, failure mode, or recovery | Names a failure but gives a hand-wave recovery | States the invariant, adverse outcome, detection/boundary, and recovery or client-visible result |
| Trade-off and simplicity | Adds infrastructure by fashion or omits a rejected alternative | Rejects an option but gives a weak reason or cost | Compares the null/smallest option, names the cost, and excludes infrastructure without evidence |
| Changed-constraint adaptation | Repeats the original design unchanged | Notices the changed input but only tweaks terminology | Recomputes or re-derives the affected decision, invariant, and recovery |
| HLD/LLD/view routing | Mixes levels or selects a view unrelated to the audience/question | Picks a plausible view but leaves detail in the wrong artifact | Routes each audience/question to a separate appropriate view and says what is excluded |
| Evidence and provenance | Treats a target, document, or guess as measured/deployed fact | Labels some uncertainty but not edge/metric provenance | Separates target, estimated, measured, proposed, implemented, and documentary evidence; preserves edge provenance |

For a case with `N` applicable dimensions, the raw score is `points / (2N)`. Recommended interpretation:

- **Sound:** at least 85%, no hard failure, and no applicable dimension at 0.
- **Partially sound:** 60–84%, with no hard failure; useful direction but not ready to rely on.
- **Unsound:** below 60% or any hard failure, regardless of vocabulary coverage.

A short answer can be sound when the prompt is narrow. Do not penalize it for omitting unrelated infrastructure or for refusing to draw every possible diagram.

## Hard-failure rules

Mark the answer **unsound** if any applicable rule is true:

- It proposes architecture before required numbers or requirements and does not label assumptions.
- It gives a requested calculation with a wrong multiplier, wrong unit, or materially wrong order of magnitude.
- It claims a component solves a constraint but never states the mechanism or observable outcome.
- It omits the load-bearing invariant in a safety or consistency case, or describes no adverse outcome/recovery path.
- It reuses the original answer after a paired constraint changes the invariant, traffic, latency, consistency, retention, or recovery objective without recomputing or re-evaluating the new constraint. Retaining a stricter or simpler mechanism is sound when the answer explicitly justifies why it still satisfies the revised constraint.
- It adds Redis, Kafka, a queue, sharding, or multi-region to the simplicity counterexample without a measured ceiling, burst, durability need, or recovery objective.
- It routes an executive boundary decision to schema/class/pod detail, or routes an implementation/data relationship question only to a context diagram.
- It presents documentation, code, or a target metric as proof that a relationship is deployed or a metric is measured.

A wrong but confidently precise number is not rescued by a correct technology name. A correct number is not rescued by a list of components with no causal chain.

## Case-specific mandatory evidence

### Methodology flash-sale pair (cases 1 and 4)

Case 1 must show the burst calculation `200,000 x 25% x 2 / 10 ≈ 10,000 requests/s`, preserve the no-oversell invariant, and explain atomic reservation and duplicate-request handling. The answer must connect each added component to a constraint and cost.

Case 4 changes the allowance to at most `0.1%` bounded oversell and permits settlement within `30 seconds`. A sound answer recomputes the revised constraint and explicitly evaluates the trade-off. It may retain strict no-oversell and atomic reservation when that is simpler or safer, or change the mechanism when the new allowance makes that worthwhile. In either case, it explains the failure outcome and recovery within the `30-second` window. Repeating the original answer without this re-evaluation is a hard failure.

The answer `Intake. QPS. constraint -> component.` fails case 1 despite passing the old lexical alternatives: it has no calculation, mechanism, duplicate outcome, invariant, or cost. It is a vocabulary list, not a design.

### Estimation pair (cases 1 and 4)

Case 1 must recompute approximately `2.3k` average QPS and `12k` peak QPS at `5x`. Case 4 keeps the average but changes the factor to `20x`, so peak is approximately `46k`; it also asks for approximately `184 MB/s` at a `4 KB` payload. The grader checks the arithmetic and units, not the exact spelling of `2.3k` or `46,000`.

### HLD/LLD routing pair (diagram cases 9 and 10)

For executive scope and external-system decisions, a context/HLD view is appropriate. For implementation relationships, reservation behavior, schema, or retry state, use a component, sequence, state, or ERD/LLD view. The near-miss case must split SQL columns, retry transitions, and pods away from the executive context view; merely saying “use a diagram” is insufficient.

### Lifecycle and provenance (diagram case 11)

Lifecycle (`proposed`, `implemented`, or `retired`) is separate from evidence confidence (`unverified`, `assumed`, `documented`, or `observed`) and source kind (`code`, `document`, `runtime`, or `deployment`). A relationship copied from documentation can use `evidence_kind=document` and `evidence_confidence=documented` while its deployment/runtime claim remains unproven or review-needed. Absence of a runtime trace does not force `evidence_confidence=unverified`, and `UNVERIFIED` is not a lifecycle value. Code or document citations do not prove deployment; metrics separately say target, measured, or estimated.

## Equivalent wording policy

Accept wording when it preserves the same mechanism, boundary, invariant, and outcome. Examples:

- “atomic reservation” and “conditional stock decrement in one transaction” are equivalent only when both prevent oversell under concurrent requests.
- “idempotency key,” “duplicate-request dedupe,” and “replay-safe request record” are equivalent only when the answer says what a retry returns or suppresses.
- “system context,” “context-level C4,” and “external-boundary HLD” are equivalent when the audience and excluded detail are correct.
- `12k`, `12,000 requests/s`, and `1.2e4 QPS` are equivalent when the calculation and peak factor are shown.

Do not require the exact phrase used by the skill. Conversely, do not treat two words such as “cache” and “QPS” as equivalent to a mechanism, calculation, or outcome.

## Reporting template

```md
Case: [skill]/[id]
Verdict: sound | partially sound | unsound
Hard failure: none | [rule]
Applicable dimensions: [N]
Score: [points]/[2N]

Evidence:
- Scope/assumptions: [answer evidence]
- Calculation: [formula, recomputation, units]
- Mechanism/outcome: [constraint -> mechanism -> observable result]
- Invariant/failure: [invariant, adverse timeline, recovery]
- Trade-off/simplicity: [null option, rejected alternative, cost]
- Changed constraint: [what changed and what was re-derived]
- View routing: [audience/question -> view; excluded detail]
- Provenance: [node/edge/metric/lifecycle evidence]

Lexical smoke signals observed: [assertion types and hits]
Semantic gaps: [missing or contradictory behavior]
```

Keep lexical hits and semantic judgments in separate fields. Never report a lexical assertion pass as proof that the design is correct.
