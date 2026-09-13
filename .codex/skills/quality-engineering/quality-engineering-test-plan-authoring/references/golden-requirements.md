# Golden Requirements — Generator Regression Fixtures

Re-run every fixture whenever the parser, scenario expansion, completeness check, or HALT logic in this skill or `specialist-test-planner` changes. Each fixture pins the expected generator behavior; a drift in any column is a regression.

Mirrored as `pressure_scenarios` in `evals/evals.json` so `skill-benchmark` and `evals-run` exercise them automatically.

## G1 — Ultra-short requirement

- Input: `AC-1: Checkout works correctly.`
- Expected behavior: `HALT: too_short`
- Expected classes: none produced
- Required flags: quote the AC, offer 2-3 interpretations with a default
- Wrong generator: produces P/N/E for "checkout" from what the code currently does

## G2 — No expected behavior

- Input: `AC-2: User can filter the order list by date range.`
- Expected behavior: `HALT: no_expected_behavior` in autonomous mode; in interactive mode, ask what the filtered list must show and whether out-of-range orders are hidden or greyed
- Expected classes: none until answered; if forced to draft, every `Expected` carries `ASSUMED:`
- Required flags: `ASSUMED` count equals scenario count
- Wrong generator: writes `Expected: filtered orders are shown` with no source

## G3 — Multiple ACs bundled

- Input: `AC-3: Admin can export orders as CSV, schedule a weekly export email, and revoke a scheduled export.`
- Expected behavior: `HALT: bundled_acs`; propose a split into three ACs and wait
- Expected classes: none until the split is confirmed
- Required flags: proposed split listed verbatim
- Wrong generator: silently splits and invents boundaries between the three actions

## G4 — Negative that violates no condition

- Input: `AC-4: Orders over 1,000,000 VND get free shipping.` plus a draft N scenario `Cart total 1,500,000 -> free shipping banner is not shown`
- Expected behavior: reject the draft N; the stated condition is met, so the outcome contradicts the AC. Valid N is cart total below the threshold with fee charged.
- Expected classes: P=1, N=1 (below threshold), E=1 (exactly 1,000,000)
- Required flags: rejection reason names the condition
- Wrong generator: keeps the draft N because it "looks negative"

## G5 — Edge identical to normal flow

- Input: `AC-5: Password reset link expires after 30 minutes.` plus draft E scenario `Use the reset link after 5 minutes -> reset succeeds`
- Expected behavior: reject the draft E as a rephrased P; valid E is use at exactly 30 minutes (outcome per AC wording: "after" means still valid at 30:00) and at 30:01
- Expected classes: P=1, N=1 (use at 31 minutes -> rejected), E=1 (exactly 30:00)
- Required flags: boundary value named
- Wrong generator: accepts the 5-minute case as an edge

## G6 — Contradicting ACs

- Input: `AC-6a: Guest users can add items to the cart.` and `AC-6b: Only signed-in users can view the cart.`
- Expected behavior: `HALT: contradiction` naming both ACs and asking whether guests add to a cart they cannot see, or whether 6b is wrong
- Expected classes: none until resolved
- Required flags: both AC ids quoted; one of the five never-alone questions raised (does this contradict another part of the system?)
- Wrong generator: writes P for both and an N for guest cart view, hiding the conflict inside a plausible plan
