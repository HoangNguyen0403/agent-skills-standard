# T1 — traffic and overload guidance

Status: corrective revision r2 settled at 2026-10-26, repairing independent architecture review findings T1-A1/A2/A3. Guidance completion only. No efficacy, acceptance, release, model-run or test result is claimed. No further source edits in T1 scope until the next review assignment.

Baseline: `92d06c420f6a41f08e11579423e4e3eacdb7880d`. Only the four T1-locked files were mutated. Peer T2/T3 edits in the same worktree were neither read into this scope nor modified. Review evidence preserved unmodified: `T1-architecture-review.md` SHA-256 `e77083860f45a61fe93c9c445fd513ab70c195dd416e380d00bdf33a7c576d2e`. Frozen originals still match the baseline snapshot (spot-checked: `baseline-snapshot/…/building-blocks.md` = `b5b7eb34…`).

## Changed files and hashes (r2)

| File | Baseline SHA-256 | Settled SHA-256 (r2) | Bytes | Lines | Words |
| --- | --- | --- | --- | --- | --- |
| `skills/system-design/system-design-building-blocks/SKILL.md` | `71236855db7b29b5753c059c030c092a5295839d4ee9434187779b6b4c291785` | `48d3b5576fd8862c5afafce441deb9872ec059dae3fe413dac43bf5e7180ff6a` | 3879 → 5125 | 72 → 77 | 615 → 807 |
| `skills/system-design/system-design-building-blocks/references/building-blocks.md` | `b5b7eb34a3daee42223a0cd9cd72cc5b386f1585c77edb013baece5c7e4d0fe8` | `35c8f78b27316e283127b5c76ef2a9b653738c27214fc4ee38ba54470df85c22` | 5853 → 14878 | 85 → 130 | 956 → 2236 |
| `skills/system-design/system-design-resilience-ops/SKILL.md` | `952db0997ed9c58804b22769b7f0252d07c1bfc3afa7990ac42f563b99203d33` | `c17b0748a32f9c2f46d74133ff2e17e3e74a5faad3b1576ef449f47f95677153` | 4433 → 5815 | 74 → 79 | 686 → 878 |
| `skills/system-design/system-design-resilience-ops/references/reliability-operations.md` | `9abb27ff728ac2afd8bff7855eb82c7d61c68c049dd791b82a044d22efb03849` | `b9628d52dcfe04dbe81b349131d5e4cc873f73b9513251132b280ba7fc5d0e32` | 8619 → 14988 | 92 → 134 | 1324 → 2300 |

Superseded r1 hashes (for review traceability only): `0a2cbfa7…`, `b98bf71e…`, `48260131…`, `3b131f20…`.

Untouched, hash-equal to baseline: `…/system-design-building-blocks/evals/evals.json` (`7f8f052e…`), `…/system-design-resilience-ops/evals/evals.json` (`e1de71f5…`). No metadata, mirror, generator, index or changelog edit.

## Corrective revision r2 (review T1-A1/A2/A3)

**A1 — shared ≠ optional; panic/ejection never bypass enforcement.** Applied.

- `reliability-operations.md:25-27` replaces the single "optional or shared" bullet with three: per-request-class required/optional classification (shared/local is blast radius, not serving safety; shared auth or quota is mandatory for protected routes), mandatory enforcement as a local fail-closed rejection rather than a health state, and readiness/discovery vs passive outlier ejection vs panic as separate mechanisms.
- `building-blocks.md:13-15`: same classification; discovery vs balancer ejection split; panic now explicitly a routing decision that cannot authorize skipping auth or quota, with local rejection when the enforcement path is unavailable.
- Bodies: `building-blocks/SKILL.md:61` now says an optional dependency degrades its response while a mandatory one fails closed, and shared blast radius never makes a mandatory check optional; `resilience-ops/SKILL.md:42` adds that no health, ejection, or panic state authorizes skipping a mandatory auth or quota check.

**A2 — pool size is a connection bound, not a QPS bound.** Applied.

- `reliability-operations.md:39-42,46`: capacity terms carry explicit units; `callers × per-instance pool size` is compared only to connection/concurrency ceilings; rate is derived as `rate ≈ concurrency / service time` (100 connections at 10 ms ≈ 10,000 req/s), and rate admission is bounded separately against the measured bottleneck ceiling with fan-out and retries.
- `building-blocks.md:22-28`: same units rule in the admission inequality; downstream paragraph separates the connection/concurrency cap from the derived-rate cap.

**A3 — limiter shape classification and stated overshoot assumptions.** Applied.

- `building-blocks.md:95-108`: two shapes are named — disjoint allocation (conserved; shares sum to the allowance; requires disjointness, exact total, exclusive re-allocation, bounded lease) and copied budget (not conserved; aggregate can reach `replicas × allowance`, excess grows with partition duration). Required declaration: allowance unit per window, burst allowance, refill owner, allocation/lease lifetime, replica bound, post-authority-loss behavior. Bound type must be stated as instantaneous rate, admissions per window, or cumulative overshoot; "bounded overshoot" alone is rejected as a claim. Partition modes are enumerated with their bounds, and a correctness-boundary quota fails closed on protected routes while an advisory limit may fail open.
- Unsupported numeric claim removed from the earlier report timeline; corrected below.

Preserved: AC-04 stream/drain rules, L4/L7 multiplexing, least-connections cost caveat, deadline/retry ownership, downstream pool ceilings, TLS trust boundary, DNS deferral, queue-age autoscaling. No unrelated expansion.

## AC evidence (r2)

**AC-ROI-02 (failure capacity, not HA from instance count)** — met.

- `building-blocks/SKILL.md:62`: admitted demand must fit surviving instances × safe per-instance load after the largest in-scope loss; otherwise shed or degrade rather than claim HA. `:73`: "No HA from instance count".
- `references/building-blocks.md:22-28`: unit-bearing capacity terms, admission rule at `:24`, ordered degradation at `:26`, downstream connection ceiling and derived-rate ceiling at `:28`.
- `resilience-ops/SKILL.md:30`: same inequality post-failure; `:74`: matching anti-pattern.
- `references/reliability-operations.md:33-46`: four-term table with units, recompute-on-scaling, and the dimensional rule separating connections from rate.

**AC-ROI-03 (optional shared dependency does not eject the fleet)** — met, with the review's shared/required distinction now explicit.

- `building-blocks/SKILL.md:61`: optional degrades, mandatory fails closed, shared ≠ optional.
- `references/building-blocks.md:13-15`: per-request-class classification; discovery vs passive ejection; panic constrained against enforcement bypass.
- `resilience-ops/SKILL.md:42`: required-dependency readiness only; ejected-fraction cap; fail-closed clause.
- `references/reliability-operations.md:25-31`: same split; local rejection path instead of fleet-wide unready; recovery verified by traffic (`:29`).

**AC-ROI-04 (finite buffering/draining/recovery contract)** — unchanged, met.

- `references/building-blocks.md:59-67`: bytes/items/time bound (`:63`), backpressure before the bound (`:64`), disconnect cleanup (`:65`), resume cursor plus retention window (`:66`), per-instance cap and maximum lifetime (`:67`).
- `resilience-ops/SKILL.md:64,75`; `references/reliability-operations.md:48-57` (drain) and `:69-74` (stream backpressure, leak detection, recovery verification).

Review citations above shift by the A1/A2 insertions; the numbers here are the r2 source of truth.

## Rule changes (entire T1 overlap delta)

| Mechanism | Change |
| --- | --- |
| L4/L7 + multiplexing | L4 balances connections, L7 balances requests; HTTP/2-3 multiplexing makes connection counts understate load (`building-blocks.md:5-7`). |
| Least connections vs work | Assumes one request per connection and similar cost; mixed cost needs active-request counts or cost weights (`:8`). |
| Health model | Readiness/liveness/startup pointer (`:12`); per-request-class required/optional (`:13`); discovery vs balancer ejection (`:14`); panic as routing, not authorization (`:15`). |
| Active/passive detection, recovery | Both halves required; ejection bounds and fraction cap; recovery confirmed by traffic (`building-blocks.md:14`, `reliability-operations.md:28-29`). |
| Draining | Deadline-bounded drain inside termination grace, cancel-and-retry contract, stream close + cursor window (`reliability-operations.md:48-57`); BB links the sequence (`building-blocks.md:16`). |
| Residual capacity | Failure-capacity sections in both packages with units, admission inequality, ordered degradation, recompute trigger, downstream connection and derived-rate ceilings (`building-blocks.md:18-28`, `reliability-operations.md:33-46`). |
| Deadlines/retry ownership | One retrying layer, remaining-deadline propagation, full-path budget including queue wait, stated shedding order, autoscaling ≠ admission control (`reliability-operations.md:61-67`). |
| Queue/autoscaling | Consumer autoscaling on queue age vs drain deadline, capped by downstream concurrency (`building-blocks.md:57`). |
| Stream buffers/cancel/reconnect | Producer bounds and cursor mechanics in BB (`:59-67`); hard-limit enforcement, leak detection, recovery verification in RO (`:69-74`). |
| Downstream pool ceilings | Existing RO pool cap preserved; connected to admission arithmetic with connection-vs-rate units (`reliability-operations.md:46`). |
| TLS trust boundary | Termination point, re-encryption/mTLS inside the trust zone, identity assertion with client-header overwrite (`building-blocks.md:81`). |
| DNS | No new owner; failover-delay/resolver-cache qualification deferred to the communication category (`building-blocks.md:83`); CM body untouched. |
| Gateway dependency failure | Enforcement vs enrichment split; auth/quota fail closed, optional enrichment may fail through (`building-blocks.md:80`; body `SKILL.md:64`; table row `:33`). |
| Distributed limiter | Conserved disjoint allocation vs copied budget; declared units/window/burst/refill/lease/replica/partition behavior; explicit bound type; mandatory fail-closed (`building-blocks.md:95-108`). |
| Session state | Unchanged. |

## Synthetic adverse timelines (r2)

**A. Residual capacity (AC-02).** 6 API instances, measured safe load 100 rps each, peak admitted 520 rps. T+0 zone loss removes 3. Surviving capacity 300 rps < 520. Correct: admission caps at 300 and sheds 220 rps by declared class; partial degradation with a known bound. Incorrect: "6 replicas = HA", all 520 admitted, unbounded queue, health failures, remaining 3 eject, total outage.

**B. Shared dependency classification (AC-03, corrected).** The recommendations service is shared and optional: its outage empties the panel, pages still serve, readiness unchanged. The auth/quota service is also shared but mandatory for protected routes: on its outage, each replica rejects protected requests locally with a fail-closed error while public routes keep serving. Incorrect variants: (i) readiness probe on the shared auth service takes all 12 instances out of discovery, so even public routes fail — a fleet-wide outage from a local dependency failure; (ii) panic mode routes protected traffic to endpoints that cannot verify it, i.e. unauthenticated forwarding. Neither the ejected-fraction cap nor route-to-all is an authorization mechanism; the safe degraded mode is local rejection, not fleet unready and not unverified pass-through.

**C. Slow streaming client (AC-04).** Mobile SSE client on a stalled tunnel; server produces 5 MB/s into an unbounded per-connection buffer. T+40 s node memory exhausted, OOM restart drops 8 k healthy streams. Bounded: 4 MB per stream, producer blocks at the flow-control window, 30 s without consumer progress closes the stream and stores the cursor; reconnect inside the 5 min window resumes, past it receives an explicit restart.

**D. Retry amplification.** App 3 × mesh 3 × gateway 2 = up to 18 attempts per user request; downstream at 5 k rps sees 90 k. One retrying layer plus a 10% retry budget and remaining-deadline propagation keeps the multiplier inside the caller deadline.

**E. Limiter shape (AC and A3, corrected).** Global allowance 100 requests/s across 8 edge replicas.
- *Conserved:* each replica holds a disjoint 12.5 requests/s share. Aggregate is 100 requests/s; a partition costs at most the stale shares still in force (bounded by the lease), not 800 rps. This design is correct and must not be rejected as an "8× overshoot".
- *Copied:* each replica holds a full 100 requests/s allowance and refills independently. During a T-second partition aggregate admission can reach 800 requests/s, and the excess accumulates roughly in proportion to T until reconciliation; the exact cumulative bound must be stated as a rate bound, a per-window bound, or a partition-horizon assumption. Without one of those, "bounded overshoot" is not a claim the design can make.
- *Enforcement:* if the quota is a correctness boundary (billing, entitlement), protected routes fail closed when the authority is unreachable; only an advisory limit may fail open.

**F. Gateway fail-through.** External auth unavailable, gateway configured to pass through; forged bearer tokens reach the service and quota is unenforced. Correct: enforcement dependencies fail closed; only enrichment passes through with a named default.

## Primary citations used

- Multiplexing/concurrent streams: [RFC 9113 §5.1](https://www.rfc-editor.org/rfc/rfc9113#section-5.1).
- Passive/active detection and ejection: [Envoy outlier detection](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier).
- Degenerate-health behavior, 50% default: [Envoy panic threshold](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/panic_threshold).
- Enforcement filter failure default: [Envoy ext_authz](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_authz_filter).
- Termination grace default 30 s, `preStop` before `SIGTERM`: [Kubernetes Pod lifecycle — termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination).

Rate/concurrency (`rate ≈ concurrency / service time`), limiter allocation shapes, and stream bounds are stated as derived design rules; no vendor document is cited for them and no product-specific behavior is asserted.

## Candidate public evaluation prompts (for T5; no sealed case read)

1. "Six API pods behind an L7 balancer, each safely handles 100 rps, peak 520 rps, one zone failure takes three pods. Are we highly available?"
2. "Our readiness probe checks the shared auth service, so an auth outage removed all 12 instances and even public pages failed. What is the correct design?"
3. "Mobile clients hold SSE connections over flaky networks; slow ones never disconnect and nodes OOM during deploys. What is missing?"
4. "We retry three times in the app, twice in the mesh, once at the gateway. p99 is 9 s and the downstream is at 5x load. What is wrong?"
5. "Our database allows 100 QPS. We have 10 callers with 10 pooled connections each, so we are within limits — right?"
6. "Eight edge nodes each cache a 12.5 rps share of a 100 rps quota and reconcile every 10 s. Is that safe during a partition?"
7. "The auth service went down, the gateway passed traffic through, and support found forged tokens. How should this fail?"

## Token footprint (r2)

Token estimates are bytes/4, not measured tokenizer output.

- SKILL bodies (default load): 8,312 → 10,940 bytes, 1,301 → 1,685 words; ≈ 2,078 → 2,735 tokens (+657, +32%).
- References (on demand): 14,472 → 29,866 bytes, 2,280 → 4,536 words; ≈ 3,618 → 7,467 tokens (+3,849, +106%).
- Both SKILL.md files remain under the 100-line limit (77, 79). Review-driven growth is concentrated in references; body growth is ≈284 and ≈347 tokens.

## Verification performed

- SHA-256, byte, line and word counts of all four files at r2; eval JSON hashes still equal to baseline; review file hash recorded for preservation.
- Inbound anchor scan for `building-blocks.md#` / `reliability-operations.md#` across `skills/`, `docs/`, `benchmarks/`, `.github/`: only intra-T1 links exist; all anchors resolve to headings (`#health-checks`, `#health-detection-and-drain`, `#draining-and-termination`, `#failure-capacity`, `#streaming-connections-and-buffers`).
- Post-r2 evidence lines confirmed by grep: `building-blocks.md:13-16,22-28,57,59-67,80-83,95-108`; `reliability-operations.md:25-31,39-46,48-57,61-67,69-74`; bodies `building-blocks/SKILL.md:61-64`, `resilience-ops/SKILL.md:30,42,64,74-75`.
- Link and anchor check repeated after the corrective edits: all `#…` anchors in the new cross-links resolve to headings in the target files, and no external inbound anchor was broken (grep over `skills/`, `docs/`, `benchmarks/`, `.github/`).
- Not run, per brief: build, lint, tests, formatters, generators, eval tooling, model execution. No claim that `validate:all`, `audit:keywords` or any eval assertion passes.

## Risks and open items

1. **Keyword/escalation drift** unchanged: new vocabulary (disjoint allocation, lease, derived rate, ejection cap) is absent from triggers and evals; T5 owns routing/assertion updates.
2. **Anchor stability**: cross-links depend on heading text; T6 must treat these anchors as generated-output-sensitive.
3. **Derived rules without vendor citation**: rate/concurrency, limiter shapes and stream bounds are design rules; a reviewer wanting product-specific citations for a particular limiter implementation should request them as a bounded addition rather than assume them.
4. **Duplicate pressure**: BB and RO both state the required/optional rule (AC-03 in both owners); procedure stays in RO, selection consequence in BB. Future edits must not re-merge them.
5. **Size**: package bytes +79% versus baseline (22,784 → 40,806), driven by review remediation in references. This is cost, not benefit, and will move size-based structural metrics.
6. **Residual enforcement detail**: the guidance now requires fail-closed enforcement and local rejection, but does not specify a particular auth failure response shape (status, cache of negative decisions) — deliberately left to the security category. If review requires a concrete contract, that is a separate bounded decision.
7. **Efficacy**: no evidence these rules change model behavior; requires T5 binding plus an authorized T7 run.
