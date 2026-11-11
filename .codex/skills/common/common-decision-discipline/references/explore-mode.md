# Explore Mode (Open, Novel, or Solution-Biased Intake)

Demand-loaded reference for `.agents/workflows/brainstorm-feature.md` and `skills/common/common-decision-discipline/SKILL.md`.

## 1. Gating Rule (When to Trigger)

Activate Explore mode **only** when all of the following conditions hold:
1. **User intent is known or clarified:** Explore mode does **not** override the rule to ask first when user intent is genuinely unknown (`AC-003`). If intent is unknown, ask the single highest-impact open question and stop.
2. **Problem character is open, novel, or solution-biased:**
   - *Open*: The user describes an outcome or struggle with multiple viable paths.
   - *Novel*: No established in-repo pattern or single standard architecture exists.
   - *Solution-biased*: The user prematurely prescribes a complex mechanism (e.g. "set up Kafka and event sourcing for 2 devs").

### When NOT to Trigger
- **Clear requests:** Routine requests with a direct solution path (e.g. adding a flag, a single config key, a standard migration).
- **Single evidenced viable path:** Expand-contract column rename, established repo pattern (`AC-005`).
- **Administrative queries or low-risk maintenance.**
- On clear or single-path requests, load **zero** Explore content; keep the single viable path direct and unpadded.

---

## 2. Core Exploration Protocol

When Explore mode is active, execute the following five steps before finalizing the brief or approval card:

### Step 1: Reframe the Problem Statement
- Separate the underlying customer job or engineering friction from the user's proposed mechanism.
- State:
  - **User-stated intent**: What the user explicitly asked for or hypothesized.
  - **Underlying problem & constraints**: What bottleneck or friction actually needs resolution.
  - **Explicit non-goals & anti-goals**: What the solution deliberately must NOT do.

### Step 2: Generate Options Before Critique
- Diverge across distinct architectural paradigms before converging or critiquing.
- Consider:
  - *Status quo / do-nothing / manual workaround*: What happens if we do not build?
  - *Lightweight / standard pattern*: Simplest viable in-repo mechanism (e.g. in-process queue, sync call with timeout, DB index).
  - *Dedicated / distributed solution*: Component or external service only if scale justifies it.
- **Lane discipline**:
  - *Direction lane*: Retain at most **3** concrete technical approaches.
  - *Why lane*: Retain distinct business alternatives (build, buy, partner, defer, do nothing). Do not cross-contaminate lanes.

### Step 3: Honest Option Cards with Trade-offs
For each retained option, state:
- **What**: One-line architecture summary.
- **Load-bearing assumption**: The critical premise that must hold true.
- **Evidence limits**: What is unverified in the repo or context.
- **Decisive trade-off**: Primary advantage vs primary penalty (latency, operational complexity, ops burden).
- **Proof**: Observable verification that demonstrates contract satisfaction.
- **First failure condition**: First observable sign that this option is wrong.

### Step 4: Identify the Riskiest Assumption and Cheapest Test
- Out of all retained options and the recommended direction, name the **single riskiest load-bearing assumption**.
- Categorize by risk domain: *Feasibility*, *Viability*, *Usability*, *Security*, or *Operational*.
- Define the **cheapest decisive test** (e.g. 15-minute throwaway probe, DB query profile, inspect existing queue depth, check API quota) to validate or invalidate the assumption before planning or implementation starts.

### Step 5: Recommendation with Strongest Objection
- Recommend the direction that provides the highest net utility at lowest operational complexity.
- Explicitly disclose:
  - **Strongest objection**: The most severe valid counter-argument against the recommendation.
  - **Reversal / Fallback condition**: The concrete observation or metric threshold that would reverse this decision and trigger the fallback path.

---

## 3. Review Surface and Card Invariant

- The compact human-facing Decision Card presented in chat must remain **≤ 250 words**.
- Exploration depth (problem reframing, option cards, risk breakdown) lives in the saved brief artifact (`docs/brd/brd-[slug].md`).
- Never dump raw option brainstorming into chat if it exceeds the card word cap. Surface necessary overcap risks using `Over-cap risk:` on a single line.
