# Evidence-Led Marketing Pilot Handoff Runbook

## Status & Governance Notice
- **Status**: `prepared_pending_T12_and_human_acceptance`
- **Initiative Slug**: `evidence-led-marketing` | **Campaign ID**: `standards-demo-01` | **Context Revision**: `ctx-rev-20261025-capture-ee18d7f5`
- **Scope**: **Preparation only (T13)** (`docs/srs/srs-task-list-evidence-led-marketing.md:79`). T13 depends on T12 (`docs/srs/srs-task-list-evidence-led-marketing.md:78`), which remains partial (blocked on T11). Staged strictly as `prepared_pending_T12_and_human_acceptance`; does not execute actual pilot, external outreach, infrastructure deployment, evaluator calls, or simulated human approvals.
- **Precedence**: Canonical operational runbook; supersedes historical campaign draft at `campaigns/standards-demo-01/review-handoff.md`.

---

## 1. Traceability & Pre-Pilot Governance Gates

Governed by canonical SRS (`docs/srs/srs-evidence-led-marketing.md`: SRS-001..006, SRS-010) and PRD (`docs/prd/prd-evidence-led-marketing.md`):

1. **Gate 1: Upstream T12 Release Verification**: Integrated candidate verification, evals, and security checks must settle (`PENDING T12`).
2. **Gate 2: Human Response Owner Assignment (AC-026)**: Named maintainer assigned to community monitoring and triage (`PROPOSED: HoangNguyen`).
3. **Gate 3: Privacy & Data Storage Approval (SRS-010, AC-033)**: Human maintainer must approve private storage root, retention, consent intake, and withdrawal procedures (`PROPOSED / UNAPPROVED`).
4. **Gate 4: Campaign Publication Sign-Off (AC-004, AC-026)**: Formal written owner DEC required. Assets remain `state: "prepared"`, `status: "not_authorized"`.

---

## 2. Canonical Time Windows, Cutoffs & Maturity

- **Half-Open Windows**: Campaign acquisition $[T_{\text{acq\_start}}, T_{\text{acq\_end}})$ and cost window $[T_{\text{cost\_start}}, T_{\text{cost\_end}})$ are strictly half-open $[T_{\text{start}}, T_{\text{end}})$ (30 days proposed until frozen by campaign owner; cost window must match `cost_mapping` exactly).
- **Effective Occurrence Cutoff**: $T_{\text{cutoff}} = \min(T_{\text{as\_of}}, T_{\text{coverage\_end}})$. Reports with $T_{\text{occurred}} > T_{\text{cutoff}}$ or $T_{\text{reported}} > T_{\text{as\_of}}$ are excluded. Occurrence cannot follow reporting ($T_{\text{occurred}} \le T_{\text{reported}}$).
- **Exact 14-Day Maturity**: An activation $a$ is mature iff $\min(T_{\text{as\_of}}, T_{\text{coverage\_end}}) \ge a + 14 \times 86400\text{ s}$ ($a + 1,209,600\text{ s}$). Starter cannot follow activation. Reaching Day 44 does **not** imply full maturity if coverage ends early ($T_{\text{coverage\_end}} < a + 14\text{d}$).
- **Qualifying Repeat Interval**: Must occur in $(a, a + 14 \times 86400\text{ s}]$ on a **distinct UTC calendar date** from activation $a$.

---

## 3. Cohort Partitioning, Denominators & Zero States

- **Classification**: Only eligible external consented participants (`role: "external"`, `consent: "granted"`) contribute. All others (internal, bots, evaluators, unconsented, withdrawn) route to `excluded_participants`.
- **Three-Way Mature Partition**: Mature activations partition into `mature_confirmed_repeat`, `mature_confirmed_no_return`, and `mature_unknown`.
- **Denominator Rule**: $\text{Repeat Rate} = \frac{\text{mature\_confirmed\_repeat}}{\text{mature\_activated}}$. Unknowns **remain in the denominator**; immature activations are excluded.
- **Contradictory Conflict**: Contradictory qualifying repeat plus full-window no-return rejects the snapshot (`CONTRADICTORY_REPORTS`, no newest-wins).
- **Zero Denominator Rules (SRS-004)**: Zero starters $\to$ status `unavailable` (`zero_starter_denominator`). Zero mature activations $\to$ status `unavailable` (`zero_mature_denominator`). Zero repeats with positive denominator $\to$ `0.000000`. Null cohort is `unavailable`; empty cohort is count 0.

---

## 4. Budgets & Cost Accounting (Cash vs. Hours Separation)

- **Separation & Precision**: Cash ($) and maintainer capacity hours (hrs) are non-convertible metrics. Capacity hours tracked at 4 decimals (`0.0001` hrs) and rendered at 6 (`0.000100`). Labor savings must never be booked as cash revenue or margin.
- **Four Cost Categories**: (1) Tool/asset authoring, (2) Evaluation/review/testing, (3) Bugfix/remediation, (4) Support/triage.
- **Proposed Budgets**: Cash $\$0.00$; capacity $20.0000$ maintainer hours total across campaign (illustrative unapproved proposal; no weekly cap inference or approved thresholds).
- **Investment Calculator & Cost Mapping (SRS-005)**: Reuses `product-investment` base scenario. Explicit unique non-overlapping `cash_item_ids` and `consumed_hour_item_ids` matching cost window. Selected capacity must be asserted consumed, not saved. Hour efficiencies require `hours_complete: true` and known amounts for every selected consumed-hour item.
- **Known Zero Cash Rule**: At least one selected cash item, all selected cash amounts known, and `cash_complete: true` establish known cash. A zero total yields cash efficiency `0.000000` only with a positive corresponding denominator; otherwise preserve `cohort_unavailable`, `zero_activation_denominator` or `zero_repeat_denominator`. Empty selection or missing mapping yields `unavailable` (`unknown_cost`), which takes precedence. `cash_per_activation` uses `activated`; repeat efficiencies use `mature_confirmed_repeat`. Labor remains a separate measure.

---

## 5. Baseline Evidence & Financial ROI Precedence

- **Baseline Status**: `unknown` (`baseline_unknown`); no quantitative baseline exists and baseline is never assumed zero.
- **ROI Precedence**: Unknown cost $\to$ `unavailable` (`unknown_cost`). Known zero cost $\to$ `undefined` (`zero_cost`) regardless of benefits. Positive cost with unknown benefit $\to$ `unavailable` (`unknown_benefit`). Scenario modeling only; not attributable ROI without causal evidence.

---

## 6. Privacy, Consent & Storage Boundaries (SRS-010, AC-033, AC-034)

- **Storage Isolation**: Synthetic fixtures reside in `docs/product/evidence-led-marketing/fixtures/`. Real pilot cohorts, participant keys, contact info, and consent logs **must never** be committed to git; they reside strictly in an approved private storage root.
- **Deduplication**: Duplicate participants reject input (`DUPLICATE_PARTICIPANT`). Identical report IDs collapse; conflicting report IDs reject (`CONFLICTING_REPORT`).
- **Consent Withdrawal**: Snapshots are immutable. If consent is withdrawn, historical records are **never** mutated in place; a new private snapshot revision and hash are published with `consent: "withdrawn"`. Re-running scorecard moves the participant to `excluded_participants` and recomputes public projection.
- **Public Redaction**: Output JSON, Markdown, and errors contain zero private participant keys, report IDs, task text, or private filesystem paths. Provenance maps only to designated public aliases and lowercase SHA-256 digests (or `public_identity_unavailable`).

---

## 7. Cryptographic Revision & Hash Binding (SRS-001, SRS-006)

All scorecard outputs bind exact immutable source artifacts:
- Input file SHA-256 digest.
- Canonical ledger (`evidence.json`) SHA-256 digest.
- Investment scenario file SHA-256 digest.
- CLI executable script (`report-marketing.mjs`) SHA-256 digest (`calculation.sha256`).
- In MET records, `query_revision` must match query `SRC` `data.origin.revision`.

---

## 8. Review Procedures & Cadence

1. **Weekly Health Checks (Days 7, 14, 21, 28)**: Response Owner logs hours across 4 categories, triages blockers, and assesses operational status (`healthy`, `support_overloaded`, `critical_bug_blocked`). If blockers or capacity strain arise, Response Owner escalates to maintainers and recommends pausing promotion (recommendation to owner; no autonomous actions or unapproved ticket thresholds).
2. **Day 30 Interim Review Protocol (Acquisition Close)**: Record $T_{\text{acq\_end}}$, freeze acquisition, partition mature vs. immature activations. Pre-declared recommendation is typically `inconclusive` awaiting full maturity.
3. **Day 44 Final Value Review Protocol (Cohort Maturity)**: Verify observation coverage cutoff, execute deterministic scorecard CLI against private root, audit 3-way partition and reconciled costs, and formulate pre-declared recommendation.

---

## 9. Decision Governance & Pre-Declared Recommendations

In accordance with PRD Section 6, the review selects strictly from four pre-declared recommendations without unapproved numeric thresholds:
- **`scale`** *(Advisory Only)*: Verified high repeat adoption, manageable maintainer support burden within capacity limits, and zero critical onboarding blockers. **Advisory only**: Autonomous promotion forbidden; requires explicit new campaign owner authorization (`DEC`).
- **`iterate`**: Demonstrable interest and initial activation, but friction identified in CLI setup, agent configuration, or documentation clarity. Refine onboarding before further promotion.
- **`stop`**: Low developer activation, zero confirmed repeats, or persistent maintenance burden exceeding maintainer capacity. Halt promotional distribution.
- **`inconclusive`**: Missing cost mapping, unobserved cohort maturity, insufficient sample size, or contradictory evidence. Maintain status quo; no causal claims.

---

## 10. CLI Execution Runbook

### Production Command (Real Participant Data — Private Storage)
> [!CRITICAL]
> For real pilot cohorts, the scorecard CLI must be executed against an authorized private storage root using absolute paths. Never run real cohort data against public git checkouts.

```bash
# Illustrative unapproved private paths; real storage path must be designated in approved DEC:
node /path/to/agent-skills-standard/skills/marketing/marketing-measurement/scripts/report-marketing.mjs \
  /path/to/private-storage/observed-cohort-input.json \
  --authority-root /path/to/private-storage \
  --as-of "<OWNER_APPROVED_AS_OF_UTC>" \
  --format markdown
```

### Dry-Run Verification Command (Offline Synthetic Fixtures)
```bash
node skills/marketing/marketing-measurement/scripts/report-marketing.mjs \
  docs/product/evidence-led-marketing/fixtures/synthetic-input-combined.json \
  --authority-root docs/product/evidence-led-marketing \
  --as-of 2026-10-15T00:00:00Z \
  --format markdown
```

### CLI Exit Codes
- **`0`**: Success / Coherent (schema-conforming metrics or legitimate `unavailable` statuses).
- **`1`**: Semantic / Schema Error (closed schema failure, timestamp logic, hash mismatch, contradictory reports).
- **`2`**: Invocation / I/O / Gap (invalid CLI args, authority root path escape, missing dependency capability).
- **`4`**: Internal Error (fixed `INTERNAL_ERROR` envelope).

---

## 11. Milestone Sign-Off Block (Unapproved Proposal Template)

*Procedural review record template only. Approvals cannot be simulated or pre-authorized.*

```markdown
### Milestone Value Review Sign-Off Record
- **Evaluation Milestone**: [Day 30 Interim | Day 44 Final]
- **Execution Timestamp**: YYYY-MM-DDTHH:MM:SSZ
- **CLI Executable SHA-256**: [64-character lowercase hex digest]
- **Input Snapshot SHA-256**: [64-character lowercase hex digest]
- **Canonical Ledger SHA-256**: [64-character lowercase hex digest]
- **Selected Recommendation**: [scale (advisory) | iterate | stop | inconclusive]
- **Action Decision**: [Pending Formal Campaign Owner DEC]
- **Campaign Owner**: _______________________ Date: YYYY-MM-DD
```
