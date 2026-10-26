# Strategy Selection Protocol

## Overview

This protocol governs the selection, budgeting, and channel evaluation for developer tool marketing campaigns in `agent-skills-standard`. It enforces realistic resource bounds, community compliance, and explicit rejection criteria.

## 1. Developer Marketing Channel Evaluation

Channels for technical developer tools exhibit distinct trust dynamics:
- **High Trust / High Intent**: Technical documentation, GitHub release notes, source code examples, reproducible benchmark tutorials, peer-to-peer technical forums (StackOverflow, Reddit r/commandline, specialized Discords).
- **Medium Trust / High Friction**: Technical blog posts, newsletter mentions, podcast interviews.
- **Low Trust / High Risk**: Paid search/social PPC ads, sponsored influencer promotions, cold outreach.

## 2. Resource Bounding & Dual-Track Budgeting

Every campaign strategy must declare two non-convertible resource budgets:
1. **Maintainer Capacity (Hours)**: Developer time available for authoring, reviewing, and community response (e.g. 8 hours/week total).
2. **Cash Budget (USD)**: Actual money allocated for infrastructure, domain registration, or authorized services (e.g. $0 for organic open-source).

**Rule**: Saved developer hours must never be booked as cash income or budget expansion.

## 3. Mandatory Rejected Channels Documentation (AC-20)

Strategy is about what *not* to do:
- **Requirement (AC-20)**: When presenting a recommended channel mix, the strategy MUST enumerate candidate channels that were evaluated and rejected.
- **Valid Rejection Rationales**:
  - `budget_exceeded`: Requires cash expenditure beyond authorized bounds.
  - `capacity_insufficient`: Requires ongoing maintenance hours exceeding team bandwidth.
  - `community_policy_conflict`: Violates platform rules, anti-spam policies, or developer cultural norms.
  - `audience_mismatch`: Channel lacks concentration of the targeted developer segment.
  - `negative_trust_risk`: Tactic carries high risk of community backlash or reputational harm.

## 4. Community Compliance & Anti-Spam Standards

Any tactic that compromises developer trust is prohibited:
- **No Unsolicited DMs**: Sending direct messages to Discord, Slack, or LinkedIn members without prior engagement.
- **No Promotional Astroturfing**: Posting synthetic endorsements, fake questions, or undisclosed promotional links on Reddit or Hacker News.
- **No Issue/PR Spam**: Opening promotional issues or PRs on third-party repositories.

## 5. Governance & Proposal State Gate (AC-04)

- Campaign plans, asset schedules, and channel selections remain strictly in `state: "prepared"`.
- A marketing strategy skill cannot authorize advertising spend, register external accounts, or trigger live public postings.
- Execution requires explicit human authorization (`DEC` reference with human approval).
