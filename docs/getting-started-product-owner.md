# Getting Started: Product Owner

You don't need to know the tech stack, or even that this repository exists, to use it. Just describe what you want.

## Say what you want

Open your AI agent (Claude, Codex, Copilot, Cursor, Gemini, or another configured runtime) and describe the idea in plain language:

> "I want an app that tracks my bakery's orders and lets customers pay online."

That's enough to start. You don't need to name a sponsor, a metric, a tech stack, or a deadline — the agent will draft sensible defaults and ask you to confirm or adjust them, at most three questions at a time, each with a recommended choice.

## What happens next

The agent runs `sdlc`, its built-in router, and walks the idea through a short chain:

1. **Why** — a one-page brief on the business goal and what success looks like.
2. **What** — the feature scope, written as plain outcomes you can react to.
3. **Build** — the agent implements it, with tests, so nothing ships unverified.
4. **Prove it** — the agent verifies its own work against fresh evidence, not assumptions.
5. **Your decision** — you get a plain-language walkthrough of what the feature actually does, and you accept or reject it before anything ships.

At every step, technical detail (file paths, commands, framework choices) is kept in a "Technical Appendix" you can skip. You'll never be asked to self-rate your technical skill — the agent infers how much detail to show you from how you describe things, and adjusts automatically if you start asking more technical questions.

## What you can say at any point

- "Go with your suggestion" — accept a recommended default.
- "Explain that differently" — ask for a plainer or more detailed version.
- "What's left before this ships?" — ask for status at any time.

## If you get stuck

If the agent is ever blocked, it will tell you exactly what decision only you can make — never a wall of technical jargon.

For a deeper reference on how the underlying workflow chain works, see [`sdlc-workflow-quick-reference.md`](sdlc-workflow-quick-reference.md).
