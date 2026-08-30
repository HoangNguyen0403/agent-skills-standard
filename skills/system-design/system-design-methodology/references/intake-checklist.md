# Intake Checklist

Ask max 3 per turn. Each question carries a recommended default so the session never stalls.
Anything the user declines to answer becomes an `ASSUMED` line in the design doc.

## Tier 1 - Blocking (cannot design without these)

| Input | Why it shapes design | Default if unknown |
| --- | --- | --- |
| Actors and top 3 use cases | Fixes scope and API surface | Derive from request verbs; confirm back |
| DAU / concurrent users | Drives all capacity math | 100k DAU |
| Read:write ratio | Decides caching and replica strategy | 10:1 read-heavy |
| Latency SLO (p95/p99) | Decides sync vs async and cache placement | p95 300ms API, p99 1s |
| Consistency need per flow | Decides store class and replication mode | Strong for money/inventory, eventual elsewhere |

## Tier 2 - Shaping (change the topology)

| Input | Why it shapes design | Default if unknown |
| --- | --- | --- |
| Peak shape (steady vs spike) | Sizes queues, autoscaling, admission control | 5x average peak factor |
| Payload size and media | Drives bandwidth, CDN, object storage | 2KB JSON, no media |
| Retention and audit needs | Drives storage growth and archival tier | 12 months hot, then cold |
| Availability target | Drives redundancy and multi-region cost | 99.9% single region |
| Geography of users | Drives edge, replication, data residency | Single region |
| Operating team and on-call | Who runs this at 3am; caps how much machinery the design may add | Owning team, business-hours on-call |
| Team and service ownership | Conway's law: boundaries follow the org that maintains them | One team owns the whole flow |

## Tier 3 - Constraining (rule options in or out)

| Input | Why it shapes design | Default if unknown |
| --- | --- | --- |
| Existing stack and managed services | Reuse beats new infrastructure | Reuse current stack |
| Team size and on-call maturity | Caps operational complexity | Small team, prefer managed services |
| Budget ceiling | Rules out multi-region and premium tiers | Cost-sensitive |
| Compliance (PII, PCI, residency) | Forces encryption, isolation, residency | None declared |
| Deadline and migration constraints | Forces phased rollout over big bang | Phased |

## Parsing Shortcut

- Verbs in the request become use cases and endpoints.
- Nouns become entities and data ownership boundaries.
- Adjectives ("fast", "reliable", "global", "cheap") become NFR targets - convert each into a number before designing.

## Review Mode Additions

When the mode is review-existing rather than new design, also collect:

- Current topology, traffic numbers, and incident history.
- Known pain: latency, cost, failure, scaling limit.
- Change appetite: refactor in place, strangle, or rebuild.
