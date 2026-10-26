# T1 architecture re-review (r2)

## Verdict: APPROVE — all three confirmed MAJORs resolved at the r2 source hashes

Independent, revision-bound architecture review of the r2 candidate only. `T1-architecture-review.md` (original CHANGES REQUESTED) is preserved unmodified; its recorded hash `e7708386…76d2e` still matches the file. Not human acceptance, executable proof or efficacy evidence.

Rules loaded (MCP): file routing returned `common-feedback-reporter`, `common-session-retrospective`, `common-skill-creator`, `common-workflow-writing`; explicit loads `common-code-review`, `common-security-audit`, `common-llm-security`, `specialist-architecture-guard`, `system-design-principles`. Session compliance audit run: generic Markdown/product-management warning only. Go/Python/React Native routing hits are not applicable to these Markdown guidance files.

## Source binding (independently recomputed)

`rtk proxy shasum -a 256`, current worktree:

| Path | r2 SHA-256 | Baseline (T0 snapshot) |
| --- | --- | --- |
| `skills/system-design/system-design-building-blocks/SKILL.md` | `48d3b5576fd8862c5afafce441deb9872ec059dae3fe413dac43bf5e7180ff6a` | `71236855…291785` |
| `.../references/building-blocks.md` | `35c8f78b27316e283127b5c76ef2a9b653738c27214fc4ee38ba54470df85c22` | `b5b7eb34…e4d0fe8` |
| `skills/system-design/system-design-resilience-ops/SKILL.md` | `c17b0748a32f9c2f46d74133ff2e17e3e74a5faad3b1576ef449f47f95677153` | `952db099…203d33` |
| `.../references/reliability-operations.md` | `b9628d52dcfe04dbe81b349131d5e4cc873f73b9513251132b280bfc5d0e32` | `9abb27ff…b03849` |

All four match T1-report.md r2 and the lead-supplied digests; baseline values were re-read from the lead-verified snapshot and match the report's baseline column. r1 hashes are correctly labelled superseded in the report.

## Finding disposition

### T1-A1 (shared vs optional; enforcement never bypassed by readiness/ejection/panic) — RESOLVED

- `reliability-operations.md:25` — per-request-class required/optional classification; "Shared or local describes blast radius, not whether serving is safe"; shared auth/quota mandatory for protected routes.
- `:26` — "Mandatory enforcement is not a health state… reject it locally and fail closed on that route; readiness, ejection caps, and panic modes change which endpoint receives traffic, never whether a check may be skipped." Fleet-wide unready is explicitly named as the wrong signal.
- `:27` — readiness/discovery, passive balancer ejection and panic are separate mechanisms; panic is a routing decision, not authorization.
- `building-blocks.md:13-15` — same split: per-request-class classification; discovery vs balancer ejection with bounded ejection fraction; panic "cannot authorize skipping authentication or quota… reject protected requests locally instead of routing them to unverified endpoints."
- Bodies: `building-blocks/SKILL.md:61` (optional degrades, mandatory fails closed, shared blast radius never makes a mandatory check optional) and `:64` (gateway auth/quota fail closed; only enrichment passes through); `resilience-ops/SKILL.md:42` (no health/ejection/panic state authorizes skipping a mandatory auth or quota check).
- Report timeline B now separates the optional shared recommendations outage (panel empty, pages serve) from the mandatory shared auth outage (local fail-closed rejection, public routes keep serving) and names both unsafe variants. No residual "optional or shared means keep serving degraded" text survives; a grep over both packages for the old phrasing and for panic/ejection language returns only the corrected rules.

### T1-A2 (connection pool is not a QPS bound) — RESOLVED, dimensional arithmetic coherent

- `building-blocks.md:28` — `callers × per-instance pool size` is a connection (or explicit request-concurrency) count and is compared only to the dependency's connection/concurrency ceiling; "Achievable rate follows from concurrency and service time — `rate ≈ concurrency / service time` — so 100 pooled connections at 10 ms per call can drive roughly 10,000 requests/s; bound admitted rate against the QPS ceiling separately, with fan-out and retries included."
- `reliability-operations.md:39-46` — unit-bearing terms in the four-term table; the same rule with an explicit "matching that 100 to a 100 QPS ceiling proves nothing."
- Arithmetic check: 100 conns × (1 / 0.01 s) = 10,000 req/s — consistent with the review's 100-connection/10 ms case. Connection ceiling and rate ceiling are now separately bounded, and retries/fan-out are included on the rate side. No unlike-unit comparison remains.

### T1-A3 (limiter shape classification and stated bound assumptions) — RESOLVED

- `building-blocks.md:95-108` — disjoint allocation conserved (eight replicas × 12.5 of a 100 requests/s limit; shares sum to the limit; requires disjointness, exact total, exclusive re-allocation — "a stale share plus its replacement is overshoot" — and a bounded lease) versus copied budget not conserved (aggregate can reach `replicas × allowance`; excess grows roughly with partition duration `T`; "Reconciling afterwards is not a bound").
- `:100` — mandatory declaration: allowance unit per window, burst allowance, refill owner, allocation/lease lifetime, replica bound, behavior after authority loss.
- `:102` — bound type must be one of instantaneous aggregate rate, admissions per window, or cumulative overshoot; "'bounded overshoot' without one of them is not a bound"; disjoint shares with no refill past lease bound excess by the stale shares still in force.
- `:103-105` — atomic ledger (check-and-decrement with expiry; exclusive lease renewal); partition mode chosen and recorded; correctness-boundary quota fails closed while an advisory limit may fail open, with the same mandatory-check rule as A1.
- Report timeline E corrected: conserved 8×12.5 = 100 requests/s and explicitly "must not be rejected as an 8× overshoot"; copied 8×100 = 800 requests/s with T-proportional excess until reconciliation and a required stated horizon. Both numbers are dimensionally correct and consistent with the source.

## AC verdicts at the r2 hashes

| AC | Disposition | Evidence |
| --- | --- | --- |
| AC-ROI-02 | PASS as guidance | `building-blocks/SKILL.md:62,73`; `building-blocks.md:22-28`; `resilience-ops/SKILL.md:30,74`; `reliability-operations.md:33-46` — failure arithmetic, ordered degradation, separate connection/rate ceilings, no HA from instance count. |
| AC-ROI-03 | PASS as guidance | `building-blocks/SKILL.md:61`; `building-blocks.md:13-15`; `resilience-ops/SKILL.md:42`; `reliability-operations.md:25-31` — optional outage degrades the class, mandatory enforcement rejects locally, fleet-wide ejection rejected. |
| AC-ROI-04 | PASS as guidance, unchanged | `building-blocks.md:59-67` (bytes/items/time bound, backpressure, disconnect cleanup, cursor + retention, per-instance stream cap and lifetime); `reliability-operations.md:48-57` (deadline-bounded drain, close signal + cursor) and `:69-74` (hard limit, leak detection, recovery verified by resumed delivery). |

## No new unsupported guarantee

The r2 additions are normative constraints, not availability or correctness promises. Remaining absolute language is either a negated claim ("cost, not a guarantee" at `building-blocks/SKILL.md:73`, `resilience-ops/SKILL.md:74`; "not a quota guarantee" at `building-blocks.md:104`) or a prohibition ("never whether a check may be skipped"). The rate/concurrency relation is stated as derived and "roughly", with measured service time required. No claim of measured throughput, achieved HA or executed drill was introduced.

## Nonblocking observations

1. `building-blocks.md:13` / `reliability-operations.md:25` classify readiness dependencies "per request class", while readiness is instance-global. The unsafe reading (fail readiness on the shared auth service and empty discovery) is directly excluded by `:26`'s "mandatory enforcement is not a health state", so this is not a blocker; a future edit should not detach `:26` from `:25`.
2. The duplicate required/optional rule across BB and RO remains intentional (selection consequence vs procedure). Keep them aligned on the next edit rather than merging — the report already flags this.
3. Derived rules (rate from concurrency, limiter shapes, stream bounds) carry no vendor citation by design; the report states this rather than implying product behavior.
4. Keyword/trigger and eval coverage for the new vocabulary is still T5/T6 scope; this review does not award routing or efficacy.

## Evidence limits

No source edits, builds, tests, lints, formatters, generators, model/eval runs, cloud calls, commits or pushes; no T5 sealed content. Checks were SHA-256 binding, bounded reading of the four r2 files and semantic arithmetic review. Guidance coherence is not runtime proof; T6 integrated checks, T5 binding, any authorized T7 evaluation, human acceptance and release remain separate.
