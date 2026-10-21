# Product Strategy Protocol

This reference defines the procedural and structural requirements for developing coherent product strategy anchored in verified authority, explicit trade-offs, and risk boundaries.

## 1. Strategic Authority Binding & Gap Management (Contract §2.2)

In an evidence-driven SDLC, product strategy does not emerge in a vacuum; it must be anchored in legitimate organizational context:
- **Authority Record (`AUTH`) Requirement**:
  - The project ledger (`docs/product/<slug>/evidence.json`) must identify a valid `strategy_authority` pointing to an `AUTH` record in the `strategy` domain (e.g. `domain: "strategy"`).
  - The authority locator references a reviewed strategic mandate (e.g., corporate annual strategy document, board-approved roadmap, or founders' mission document) with an exact cryptographic hash (`sha256`).
  - **PROHIBITION**: Never use the technical SRS or H1 implementation approval hash as product strategy authority. Technical SRS approves engineering implementation architecture; it does not confer business strategy or market direction.
- **Detecting Strategy Gaps (`strategy_gap`)**:
  - If no reviewed strategic mandate exists, or if two executive directives contradict each other:
    1. Set `strategy_authority: null`.
    2. Populate `strategy_gap` with an explicit description of the missing or conflicting guidance (e.g., "Corporate objective prioritizes enterprise retention while division mandate directs consumer expansion; unaligned target segment").
    3. Restrict all strategic outputs to proposal-level opportunity exploration (`status: "candidate"`).
    4. Prohibit recording binding investment or specification decisions (`status: "recorded"` or `outcome: "authorize"` is forbidden) until the human operator resolves the authority gap.

## 2. Strategic Positioning: Diagnosis, Guiding Policy, Coherent Action

A viable product strategy requires clear, disciplined choices (aligned with Good Strategy principles):
1. **Diagnosis**: State the obstacle or opportunity as supported, uncertain, or unknown according to reviewed `CLM` evidence. Without usable confirmed claims, preserve the gap; do not manufacture a diagnosis.
2. **Guiding Policy**:
   - What overarching approach or positioning method will overcome the diagnosed obstacle?
   - The guiding policy must establish clear differentiation against direct competitors and status quo workarounds.
3. **Coherent Actions**:
   - A coordinated set of initiatives, hypotheses, and resource commitments designed to execute the guiding policy.
   - Every action must reinforce the others rather than pursuing fragmented, conflicting feature requests.

## 3. Explicit Non-Goals, Trade-Offs, and Defer/Reject Paths

The essence of strategy is deciding what **not** to do. A strategy that attempts to satisfy all customer requests is an unprioritized backlog, not a strategy:
- **Non-Goals Schema Placement**:
  - Record explicit non-goals within `OPP` `data.rationale` and `DEC` `data.rationale` / `data.uncertainties`.
  - Non-goals define out-of-scope personas, unsupported platforms, deferred technical capabilities, and deliberately rejected use cases.
- **Defer/Reject Recommendation Paths (Discovery)**:
  - **Defer / reject only**: For discovery, recommend waiting or not pursuing an opportunity in rationale and candidate/deferred/rejected `OPP` status as justified. A proposed DEC may use only a contract-permitted outcome such as `defer` or `reject`.
  - **No proposed stop**: Contract §2.3 prohibits proposed `stop`; stop is reserved to separately authorized `value_review`. Discovery does not grant that authority.

## 4. The Four Big Product Risks (SVPG Framework)

Prior to framing hypotheses or proposing implementation, evaluate the strategy across the four fundamental product risks:
1. **Value Risk**: Will customers buy this, or will users choose to use it over existing substitutes? (Informed by customer discovery and market research).
2. **Usability Risk**: Can users figure out how to navigate and adopt the solution?
3. **Feasibility Risk**: Do engineering and architecture possess the skills, infrastructure, and performance margins to build it within time constraints?
4. **Viability Risk**: Does this solution work within the business constraints of legal, regulatory, compliance, sales channels, partner contracts, and unit economics?

## 5. Authority and Decision Recommendation Boundaries

- **Proposal vs. Authorization**: Strategy artifacts synthesize opportunities (`OPP`) and formulate hypotheses (`HYP`). They produce decision recommendations (`DEC` with `status: "proposed"` and `outcome: "propose"`).
- **Strategy Binding Invariants**:
  - For proposed learning decisions (`purpose: "learning"`, `status: "proposed"`), `data.strategy_binding` must be `null`.
  - `strategy_binding: { "authority_id": "AUTH-xxx", "revision": "..." }` is required only for recorded `investment`, `specification`, or `value_review` decisions.
  - Every reference in `critical_claims` must also be included in `depends_on`.
- **No Self-Authorization**: A product strategy agent cannot approve its own recommendations, commit capital, deploy code, or allocate engineering sprints. All commitments require separate operator or governance review.
