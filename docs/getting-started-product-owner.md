# Getting Started: Product Owner

You don't need to know the tech stack, or even that this repository exists, to use it. Just describe what you want.

## Say what you want

Open your AI agent (Claude, Codex, Copilot, Cursor, Gemini, or another configured runtime) and describe the idea in plain language:

> "I want an app that tracks my bakery's orders and lets customers pay online."

That's enough to start. You don't need to name a sponsor, a metric, a tech stack, or a deadline — the agent will draft sensible defaults and ask you to confirm or adjust them, at most three questions at a time, each with a recommended choice.

## What happens next

The agent runs `sdlc`, its built-in router, and walks the idea through a clear lifecycle:

1. **Discover** (`discover-product`, optional / opt-in) — when you need to understand customer friction, market alternatives, and problem framing before committing to a feature.
2. **Validate** (`validate-product`, optional / opt-in) — when an idea hinges on an unverified critical assumption; the agent designs a bounded experiment with predeclared stop rules, never exposing users or spending budget without your explicit host authorization.
3. **Why** (`brainstorm-feature`) — a one-page brief on the business goal, measurable target, and what success looks like.
4. **What** (`plan-feature`) — the feature scope, personas, and testable acceptance criteria you can react to.
5. **Build & Verify** (`implement-feature`, `verify-work`) — the agent implements the feature with tests, proving it against fresh evidence before handoff.
6. **Your Decision** (`uat-signoff`, `deploy-release`) — you review a plain-language walkthrough of delivered behavior and approve release to production.
7. **Value Review** (`review-product-value`, optional / opt-in) — after release and an observation window, evaluate observed metrics against baseline assumptions to decide whether to scale, iterate, or stop.

At every step, technical detail (file paths, commands, framework choices) is kept in a "Technical Appendix" you can skip. You'll never be asked to self-rate your technical skill — the agent infers how much detail to show you from how you describe things, and adjusts automatically if you start asking more technical questions.

## Where your decisions matter

- **Approving a brief is not release authorization**: Agreeing to an intake brief or experiment design approves the plan only; it never grants permission to deploy code, spend budget, or expose live customers. Production changes always require explicit human sign-off at the release gate.
- **Shipping is not the same as value**: A feature marked `released` means the software was built, tested, and deployed safely. It does not prove customer adoption or revenue ROI. Value review evaluates actual observed data after release, and an inconclusive value review does not un-ship working software.
- **Negative learning prevents wasted build**: If customer discovery or an experiment invalidates a critical assumption, the agent will recommend stopping, deferring, or pivoting—never an unconditional full build.

## What happens when tools or packages are missing

Product discovery, validation, and value-review workflows are optional opt-in capabilities that rely on specialized packages (the opt-in skills in `product-management`, including `product-evidence`, and Node >= 20). If your workspace has not opted into those packages, the agent will never fake validation or get stuck:
- It records a concrete capability gap in `missing_evidence` (e.g. `Capability gap: product-management/product-investment not installed; opt in at a reviewed ref and sync`).
- It continues safely as an unvalidated proposal or directs you to standard planning (`brainstorm-feature` / `plan-feature`).
- Missing financial numbers never block qualitative opportunity decisions: you can evaluate customer desirability even before monetary ROI is modeled.

## Fast paths and context reuse

- **Production harm comes first**: If an urgent production bug or regression occurs, tell the agent; it routes immediately to `incident-hotfix`, bypassing all product discovery.
- **Low-risk maintenance stays fast**: Routine fixes and maintenance with clear requirements do not need market research or heavy briefs; they route directly to `dev-fix` or `implement-feature`.
- **Settled work is not repeated**: Once a decision, scope, or evidence record is approved, the agent reuses it by exact reference. Missing filenames never reset completed work, and a question about one feature never blocks unrelated work.

## What you can say at any point

- "Go with your suggestion" — accept a recommended default.
- "Explain that differently" — ask for a plainer or more detailed version.
- "What's left before this ships?" — ask for status at any time.

## If you get stuck

If the agent is ever blocked, it will tell you exactly what decision only you can make — never a wall of technical jargon.

For a deeper reference on how the underlying workflow chain works, see [`sdlc-workflow-quick-reference.md`](sdlc-workflow-quick-reference.md).
