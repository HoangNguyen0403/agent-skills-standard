---
name: marketing-community
description: 'Plans authentic developer community engagement, technical discussion contributions, and qualitative feedback loops while strictly adhering to channel rules against promotional posting. Use when planning developer outreach, drafting technical forum contributions, or participating in open-source discussions. (triggers: `community engagement plan`, `developer forum participation`, `channel rules compliance`)'
guardrail: true
metadata:
  triggers:
    keywords:
      - 'community engagement plan'
      - 'developer forum participation'
      - 'channel rules compliance'
      - 'open-source community outreach'
---

# Marketing Community Standard

## **Priority: P1 (HIGH)**

Plan and execute technical developer community participation founded on substantive engineering contributions, radical transparency, and strict adherence to channel policies. Never violate community anti-promotional rules, deploy sockpuppets, or spam developer forums.

## Core Rules

1. **Channel Rule Respect & Anti-Spam (AC-25)**:
   - Thoroughly inspect target community policies (e.g. Reddit subreddit rules, Hacker News guidelines, Discord servers, GitHub Discussions).
   - If a channel prohibits self-promotion, marketing links, or external pitches, the engagement plan MUST NOT recommend circumventing, sneaking links, or violating those rules.
2. **Value-First Technical Contribution**:
   - Every community interaction must provide standalone technical value: addressing architectural challenges, sharing reproducible benchmarks, or explaining trade-offs.
   - All technical statements must consume the shared `context_revision` and cite verified claims (`proof_ref`). Do not post low-effort link-drops or ungrounded assertions.
3. **Mandatory Affiliation Disclosure**:
   - Always transparently identify maintainer or contributor affiliation for the supplied product or organization.
   - Astroturfing, fake third-party endorsements, sockpuppet accounts, and automated DM campaigns are strictly prohibited.
4. **Prepared / Proposal-Only State (AC-04)**:
   - Community engagement plans and discussion contributions are prepared drafts by default (`status: "prepared"`) and cannot authorize or perform action.
   - Skills provide procedural guidance for agents and do not enforce host-level runtime gates; autonomous agents must never post to external platforms.
5. **Product Evidence Synthesis**:
   - Synthesize community discussions into qualitative product evidence and friction logs.
   - Never treat vanity metrics (upvotes, likes, star counts) as verified user adoption or cohort retention.

## Engagement Workflow

1. **Policy Audit**: Review target forum rules for self-promotion thresholds, disclosure formats, and sanctioned showcase areas (e.g., "Show HN", weekly threads).
2. **Context & Relevance Check**: Ensure the topic directly addresses an active developer problem where the supplied product has verified evidence referencing `context_revision` and `proof_ref`.
3. **Draft Substantive Response**: Formulate an informative, code-grounded reply citing relevant architecture standards with maintainer affiliation stated.
4. **Deliver Prepared Proposal**: Output the draft with `status: "prepared"` for human maintainer review and manual posting.
## Anti-Patterns

- **No Rule Evasion**: Never suggest "framing an ad as an innocent question" in subreddits banning self-promotion.
- **No Sockpuppets**: Never create artificial personas or fake user accounts to generate synthetic buzz.
- **No Autonomous Posting**: Never publish directly to external APIs without explicit human execution.

## References

- [Community Engagement Protocol](references/community-engagement-protocol.md) — Channel rule matrices, disclosure templates, and feedback rubrics.
