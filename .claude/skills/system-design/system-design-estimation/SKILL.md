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
Estimate decision-relevant quantities before you architect. One order of magnitude decides cache, shard, and queue choices. Scope estimation strictly to the surface: estimate capacity for backend/data paths, memory/battery/network bounds for client/mobile, and call rates/buffers for SDKs; do not compute or demand irrelevant metrics for stateless, client, or SDK components.

## Core Formulas

- `average QPS = DAU x actions per user per day / 86,400`
- `peak QPS = average QPS x peak factor` (default 5x; 20-100x for flash sale, ticket drop, or scheduled push)
- `storage per year = writes per day x record size x 365 x replication factor`
- `bandwidth = QPS x payload size` (compute ingress and egress separately)
- `working set = hot records x record size`, where hot is typically 20% of data serving 80% of reads
- `connections = concurrent users x connections per user`; compare against pool and file-descriptor limits

## Method

1. Round every input to one significant figure. Precision here is false precision.
2. Compute only decision-relevant quantities for the component's surface (for backend/data paths: average/peak rates, storage, bandwidth, memory; for client/device: storage/memory limits, network/battery budgets; for SDKs: call rate, concurrency, buffer bounds).
3. Compare each calculated quantity to known ceilings from [estimation numbers](references/estimation-numbers.md) (single-node QPS, disk IOPS, NIC throughput, RAM per instance) or relevant client/device/platform bounds.
4. Name the **shaping quantity** — the primary quantity that breaks a single-node or local resource ceiling, when one exists. It dictates where scale or partitioning mechanisms must be introduced.
5. Restate every assumed input beside the result so a wrong assumption is visible, not buried.
## Cost

- Convert the sized capacity into monthly spend before recommending it: compute, storage plus egress, managed-service premiums, and the multiplier any redundancy applies.
- Cost is a design constraint, not an afterthought. A topology the budget cannot hold is not a design, it is a proposal to be rejected later.
- State cost per unit of value where it clarifies: cost per 1k requests, per GB retained, per nine of availability added.

## Latency and Availability Budgets

- Allocate the end-to-end latency objective across work, queueing, and dependencies; make each allocation fit the same request deadline and reserve time for caller/network overhead.
- A measured per-hop p95 or p99 is not an additive end-to-end percentile. Percentiles describe distributions, and their joint tail depends on correlation and fan-out. Measure the end-to-end distribution, or use explicit per-hop bounds whose sum fits the deadline; do not add independently observed p95/p99 values and call the result the path percentile. Define latency at the user/request boundary as a measurable SLI, for example the proportion of requests completing within a threshold ([Google SRE SLO guidance](https://sre.google/workbook/implementing-slos/)).
- For parallel fan-out, response latency is governed by the slowest required branch; budget that tail against the end-to-end objective.
- Serial dependency availability is the joint probability that every required dependency is available. Multiply their availability values only when independence is a justified assumption; common causes, shared infrastructure, and correlated failures change the result.
- Redundancy can reduce independent failure risk. Common-mode failures impose a ceiling on the gain, so include shared stores, configuration planes, and other correlated failures in the joint availability model; they do not necessarily erase all benefit.
- Translate the target into an error budget for the declared window before promising it.

## Anti-Patterns

- **No design before numbers**: never choose persistent storage, caching, or partitioning components before the quantities governing their selection exist (e.g., QPS and data volume for a backend store; memory/disk bounds and eviction rate for a client cache). Do not fabricate or demand irrelevant backend traffic or storage metrics for stateless, client, or SDK designs.
- **No average-only sizing**: capacity is provisioned for peak, cost is modeled on average.
- **No hidden units**: state units and time windows on every number (QPS, GB/day, GB/year).
- **No unverified precision**: do not report 4,873 QPS from an assumed DAU; report ~5k QPS.

## Verify

- [ ] Decision-relevant quantities for the surface computed and bounded (e.g., average/peak QPS for data paths; memory/storage bounds for client caches; call rates/buffers for SDKs)
- [ ] Storage projected over the retention window including replication when persistent state exists
- [ ] Shaping quantity identified and mapped to a design consequence when scaling or resource ceilings are reached
- [ ] Every assumed input labeled beside the result

## References

- [Estimation Numbers](references/estimation-numbers.md) - powers of two, latency table, single-node ceilings, worked examples
