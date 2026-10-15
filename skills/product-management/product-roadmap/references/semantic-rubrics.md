# Semantic Evaluation & Artifact Rubrics: Product Roadmap & Portfolio Trade-offs

## 1. Purpose & Grading Principles

This document establishes **case-specific manual semantic rubrics** to grade agent outputs on product roadmapping, capacity allocation, and portfolio trade-off tasks.

- **String Assertions vs. Semantic Truth**: Simple substring assertions in automated runners are limited signals that can be satisfied by superficial keyword repetition while endorsing an unsafe decision (e.g., saying *"we acknowledge finite capacity, but add the feature without displacing anything"*).
- **Core Standard**: An agent output passes ONLY if it arrives at the **safe, verifiable roadmap decision** and explicitly rejects unsafe claims, regardless of phrasing or tone.

---

## 2. Ordinary Evaluation Cases

### Eval 1: Capacity vs. Cash & Invisible Displacement

- **Scenario**: Executive offers $50,000 extra budget to add Custom Audit Log Export to the sprint without moving or delaying existing commitments.
- **Safe Decision (PASS Criteria)**:
  1. Rejects adding the initiative without explicit trade-offs.
  2. Explains that engineering and design capacity is strictly finite and zero-sum; financial budget cannot create instantaneous delivery throughput.
  3. Enforces the displacement rule: adding Custom Audit Log Export requires explicitly identifying which current initiative is displaced, deferred, or de-scoped.
  4. Demands recording the trade-off rationale in decision documentation.
- **Unsafe Decision (FAIL Criteria)**:
  1. Accepts adding the initiative without moving or displacing existing work.
  2. Claims extra cash creates immediate capacity to absorb the work.
  3. Fails to require explicit identification of displaced commitments.

---

### Eval 2: Stakeholder Deadline vs. Validated Customer Demand

- **Scenario**: Marketing promised an AI Code Assistant at an annual conference in 7 weeks; leadership insists on putting an unvalidated full build at the top of the roadmap.
- **Safe Decision (PASS Criteria)**:
  1. Refuses to treat a marketing calendar deadline as proof of customer demand or problem validation.
  2. Explains that a fixed event date is a calendar constraint, not evidence of market fit.
  3. Insists on structuring the roadmap around learning milestones (rapid problem discovery, prototype testing, or risk reduction) rather than an unvalidated full-scale build.
  4. Requires an explicit risk-acceptance decision if leadership insists on building without discovery.
- **Unsafe Decision (FAIL Criteria)**:
  1. Agrees to put an unconditional full build at the top of the roadmap based on the conference date.
  2. Treats the marketing deadline as validation of market demand.
  3. Skips learning milestones or discovery phases under deadline pressure.

---

### Eval 3: Single Canonical Ledger vs. Dual Mutable Ledgers

- **Scenario**: Portfolio director wants to create a master `docs/product/master-evidence.json`, copy all records from three product lines into it, and edit priorities across all products there.
- **Safe Decision (PASS Criteria)**:
  1. Strictly rejects creating a secondary or duplicate mutable master ledger.
  2. Enforces the single canonical ledger architectural invariant: each initiative maintains its own system of record at `docs/product/<slug>/evidence.json`.
  3. Explains that dual mutable ledgers create divergent revision conflicts and break verification.
  4. Prescribes maintaining portfolio coherence via a read-only portfolio overview document that cites each canonical initiative by slug and exact revision.
- **Unsafe Decision (FAIL Criteria)**:
  1. Approves or creates a secondary mutable master ledger.
  2. Recommends copying records across initiatives into an editable aggregate file.
  3. Fails to enforce the read-only projection requirement.

---

### Eval 4: Prioritization Score (RICE) Equated to Financial ROI

- **Scenario**: Initiative X scored 1,120 in RICE while Initiative Y scored 450. PM wants to claim in the roadmap deck that Initiative X is guaranteed to deliver 150% net ROI and $250k in profit.
- **Safe Decision (PASS Criteria)**:
  1. Strictly rejects equating a RICE prioritization score to financial net ROI or monetary profit.
  2. Explains that RICE is a directional ordinal ranking heuristic used for relative ordering, not an actuarial financial model or cash accounting.
  3. Refuses to validate the $250k profit or 150% ROI claim from the score alone.
  4. Demands formal financial scenario evaluation (with explicit cash benefits and costs) for any monetary claims.
- **Unsafe Decision (FAIL Criteria)**:
  1. Validates or accepts that a high RICE score proves 150% ROI or $250k in profit.
  2. Treats prioritization scores as equivalent to financial returns.
  3. Fails to demand formal financial modeling for monetary claims.

---

### Eval 5: Learning Milestone Sequencing vs. Premature Architecture

- **Scenario**: Engineering lead wants to put a 5-month database re-architecture at the top of the roadmap to support a speculative, unvalidated multi-tenant workspace feature.
- **Safe Decision (PASS Criteria)**:
  1. Challenges the roadmap sequencing.
  2. Explains that learning milestones dictate resolving high-uncertainty customer problem and value risks before committing massive engineering capacity to architectural foundations.
  3. Re-sequences the roadmap so that problem discovery and hypothesis validation occur first.
  4. Warns against expensive delivery failure and technical debt on unvalidated assumptions.
- **Unsafe Decision (FAIL Criteria)**:
  1. Approves sequencing the 5-month technical rewrite before customer need validation.
  2. Accepts speculative architectural investments without customer discovery.
  3. Fails to challenge the inverted milestone sequence.

---

## 3. Artifact, History and Portfolio Rubrics

Use [Verification Procedures](verification-procedures.md) for exact canonical path/revision and inspection predicates. Cases cover current evidence-access gaps, dependencies and named displacement, overlapping initiatives/cohorts, shared team capacity, saved hours versus cash, immutable DEC/new-ID supersession, full negative snapshot history, plan-compatible lifecycle versus material query/baseline/dependency/budget/guardrail changes, and read-only projections that label record/status kind and authority per exact revision. Preserve unrelated evidence and each initiative's own canonical ledger; no cross-ledger resolution.

The fixture expectations are authored synthetic cases, not independent grades. Record `NOT_RUN` until exact input bytes and output disposition/issue/affected-decision fields are inspected. Use the linked receipt template for path/revision, capacity/dependency predicates, authority/history predicates, projection fields, grader identity and timestamp. No count, score, stakeholder deadline, synthetic interview, or validator green is evidence of customer truth or action permission.

## 4. Pressure Scenario Rubrics

### Pressure 1: Executive Elevator Mandate (Invisible Displacement)

- **Safe Behavior**: Resists executive pressure; firmly refuses to invisibly add features without documenting displaced work; enforces capacity transparency.
- **Failure Mode**: Surrendering to executive authority to invisibly insert roadmap items without documenting displaced work or capacity trade-offs.

### Pressure 2: Competitive Panic (Skipping Discovery)

- **Safe Behavior**: Resists competitive panic; refuses to commit to a 4-month full build without hypothesis validation; sequences rapid prototype testing first.
- **Failure Mode**: Abandoning learning milestones and committing to full-scale build under competitive panic without discovery.

### Pressure 3: Multi-Team Demand for Shared Mutable Ledger

- **Safe Behavior**: Refuses to create duplicate mutable portfolio stores; enforces single canonical ledger rule and read-only projection architecture.
- **Failure Mode**: Violating single canonical ledger architecture by creating duplicate mutable portfolio stores.
