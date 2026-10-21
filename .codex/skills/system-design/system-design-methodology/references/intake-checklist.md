# Intake Checklist

Classify mode, depth, and surface separately. Ask at most 3 blocking questions per turn. Use only defaults that fit the journey and label them `ASSUMED`; a quick sketch can proceed with explicit assumptions.

## Intake by decision

| Ask when it can change the design | Capture |
| --- | --- |
| Journey or contract is unclear | Actors, critical journeys, inputs/outputs, success/failure visible to the user, and out-of-scope fence |
| Quality matters to a design choice | Scenario trigger, environment, response, measurable condition, and owner; include latency, freshness, availability, or recovery only when relevant |
| Data crosses ownership/trust boundaries | Source/sink, data purpose, transformations, authority, derived copies, tenant/auth/privacy boundary |
| Capacity could change topology or cost | Workload shape, payload, fan-out, retention, concurrency, budget, team/on-call; mark each number target, estimated, or measured |
| Existing system is under review | Current components and owners, actual traffic/volume/latency, incidents, pain, and the next binding constraint |
| Client or SDK surface is material | Client authority, offline need, lifecycle/device limits; SDK public behavior, compatibility, cancellation, host responsibilities |

## Surface prompts (conditional)

- **Backend/data:** relevant peak shape, read/write mix, retention, consistency, and data owner.
- **Mobile/client:** online/offline policy, pending versus confirmed state, account/logout/deletion behavior, device/network limits.
- **SDK/library:** API and compatibility promise, concurrency/cancellation ownership, bounded resource use, host integration and lifecycle.
- **Full stack:** trace the user journey across client, API, services, and data owners; do not assume every layer needs a component or separate deep dive.

## Existing-system review

Map current state and gather evidence before proposing changes. Distinguish documented evidence from runtime measurements; do not invent traffic or claim a planned measurement was run. Prefer the smallest change that moves the observed binding constraint.

## Parsing shortcut

Turn request verbs into journeys, nouns into data/ownership candidates, and adjectives into measurable quality scenarios. Ask whether each unknown affects a decision before treating it as blocking.
