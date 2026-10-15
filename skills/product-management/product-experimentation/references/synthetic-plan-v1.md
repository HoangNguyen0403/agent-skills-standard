# Fictional experiment plan fixture — EXP-001/r1

Synthetic, non-actionable training artifact; not product research, customer evidence, approval, or permission to expose traffic or spend funds.

- Scope: synthetic cohort, test-only geography, 2026-10-01 through 2026-11-01 UTC.
- Hypothesis: a fictional checkout copy change increases successful checkout completion in the test-only cohort.
- Method: a 50/50 randomized simulation; no real users or production traffic.
- Primary metric: fictional completed checkout rate, query SRC-004/r1, baseline 0.20 in the prior synthetic window.
- Guardrail: fictional error rate, query SRC-005/r1, baseline 0.01 in the prior synthetic window.
- Success: primary rate increases by at least 0.02 and the guardrail stays at or below 0.02.
- Failure: primary rate does not improve or guardrail exceeds 0.02.
- Inconclusive: synthetic sample does not distinguish those conditions.
- Bounds: 2026-10-05 through 2026-10-19 UTC; USD 0.00 budget cap; exposure cap 0; stop on any guardrail breach or scope mismatch.
- Authorization reference in the paired fixture is synthetic only and cannot authorize any real-world action.
