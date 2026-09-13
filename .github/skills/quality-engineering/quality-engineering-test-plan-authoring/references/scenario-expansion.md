# Scenario Expansion — P/N/E Contract, ASSUMED Tagging, HALT Triggers

Text is easy; test design is hard. A generator that produces many convincing scenarios can hide a missing or wrong requirement. These rules keep expansion honest.

## Scenario Classes

Every AC condition expands into up to three classes. A class is valid only when it changes a **precondition or an input**, never only the wording.

| Class | Definition | Valid example (AC: "Order over 1,000,000 VND gets free shipping") | Invalid (rephrase only) |
| --- | --- | --- | --- |
| `P` positive | Stated condition met, stated outcome observed | Cart total 1,500,000 -> shipping fee 0 | "Free shipping applies when eligible" |
| `N` negative | A stated condition is **violated**; the AC says or implies what must NOT happen | Cart total 800,000 -> shipping fee charged, no free-shipping banner | "Free shipping does not apply when not eligible" |
| `E` edge | Boundary of a stated condition | Cart total exactly 1,000,000 -> outcome per AC wording ("over" means fee charged) | Same steps as P with "large order" in the title |

Checks before accepting a class:

- N without a violated condition is not N; drop it or ask which condition it violates.
- E whose steps and inputs equal P is not E; drop it.
- If P, N, and E read alike, expansion failed; do not pad the plan to reach three.

## Expected Results and `ASSUMED`

- Every `Expected` cites its source: `AC-n`, a business rule id, or a linked ticket.
- When the AC is silent on the outcome, write `Expected: ASSUMED: <outcome>` and list the scenario under an `Assumed Results` header at the top of the plan.
- `ASSUMED` is a question for the requirement owner, not a permanent state. It never becomes an executable assertion until confirmed or replaced.
- Never invent an outcome from how the current code behaves; that bakes the current bug in as the spec.

## HALT Triggers

Stop and ask (interactive) or return `HALT: <trigger>` (autonomous) when any of these hold. Same semantics as `specialist-jira-analyst` Step 1.

| Trigger | Signal |
| --- | --- |
| `too_short` | The requirement is a single clause with no actor, action, or outcome ("Checkout works correctly.") |
| `no_expected_behavior` | Action described, outcome absent ("User can filter orders by date.") |
| `bundled_acs` | Several independent conditions in one AC; splitting silently would invent boundaries |
| `contradiction` | Two ACs or an AC and a business rule cannot both hold |
| `undefined_state` | A truth-table row (offline, empty, expired, role X) has no defined behavior |

HALT output names the trigger, quotes the offending text, and offers 2-3 concrete interpretations with a recommended default.

## Questions the Generator Never Answers Alone

Surface these to the requirement owner or QA lead; do not resolve them by inference.

1. Is this really the business behavior the system must have?
2. Which failure would hurt users or revenue the most?
3. Does this requirement contradict another part of the system?
4. Which production incidents must become regression scenarios here?
5. Which edge case is severe enough to block a release?

Answers need context outside the AC text. Record them in the plan header when given; leave them as open questions when not.
