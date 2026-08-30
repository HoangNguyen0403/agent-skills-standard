---
name: system-design-estimation
description: "Compute defensible capacity numbers before architecture: average and peak QPS, storage growth, bandwidth, working-set memory, latency and availability budgets. Use when sizing a service, provisioning infrastructure, or checking that a design survives peak load."
metadata:
  triggers:
    keywords:
      - back of envelope
      - qps
      - capacity estimate
      - storage estimate
      - throughput budget
      - peak load
      - latency budget
      - sizing
---

# Capacity Estimation

## **Priority: P1 (HIGH)**

Estimate before you architect. One order of magnitude decides cache, shard, and queue choices.

## Core Formulas

- `average QPS = DAU x actions per user per day / 86,400`
- `peak QPS = average QPS x peak factor` (default 5x; 20-100x for flash sale, ticket drop, or scheduled push)
- `storage per year = writes per day x record size x 365 x replication factor`
- `bandwidth = QPS x payload size` (compute ingress and egress separately)
- `working set = hot records x record size`, where hot is typically 20% of data serving 80% of reads
- `connections = concurrent users x connections per user`; compare against pool and file-descriptor limits

## Method

1. Round every input to one significant figure. Precision here is false precision.
2. Compute average, then peak, then storage, then bandwidth, then memory.
3. Compare each result to a known ceiling from [estimation numbers](references/estimation-numbers.md): single-node QPS, disk IOPS, NIC throughput, RAM per instance.
4. Name the **shaping quantity** - the first number that breaks a single-node ceiling. It dictates the first component added in high-level design.
5. Restate every assumed input beside the result so a wrong assumption is visible, not buried.

## Cost

- Convert the sized capacity into monthly spend before recommending it: compute, storage plus egress, managed-service premiums, and the multiplier any redundancy applies.
- Cost is a design constraint, not an afterthought. A topology the budget cannot hold is not a design, it is a proposal to be rejected later.
- State cost per unit of value where it clarifies: cost per 1k requests, per GB retained, per nine of availability added.

## Latency Budget

- Build the p95 budget as a sum of hops; every remote call spends from one fixed budget.
- Use order-of-magnitude anchors: memory 100ns, SSD read 100us, same-DC round trip 500us, cross-region round trip 100ms+.
- A synchronous fan-out of N calls costs the slowest call, not the average. Budget with p99, not the mean.

## Availability Math

- Serial dependencies multiply: three 99.9% services in one path yield 99.7%.
- Redundant replicas add nines only when failure modes are independent; a shared store or config plane cancels the gain.
- Convert the target into an error budget in minutes per month before promising it.

## Anti-Patterns

- **No design before numbers**: never pick a database or cache before QPS and storage exist.
- **No average-only sizing**: capacity is provisioned for peak, cost is modeled on average.
- **No hidden units**: state units and time windows on every number (QPS, GB/day, GB/year).
- **No unverified precision**: do not report 4,873 QPS from an assumed DAU; report ~5k QPS.

## Verify

- [ ] Average and peak QPS both stated, with the peak factor named
- [ ] Storage projected over the retention window including replication
- [ ] Shaping quantity identified and mapped to a design consequence
- [ ] Every assumed input labeled beside the result

## References

- [Estimation Numbers](references/estimation-numbers.md) - powers of two, latency table, single-node ceilings, worked examples
