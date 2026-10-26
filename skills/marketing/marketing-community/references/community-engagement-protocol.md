# Community Engagement Protocol Reference

## 1. Scope & Purpose

This protocol governs open-source community engagement, technical forum participation, and developer dialogue for the supplied product or initiative context. It operationalizes requirements from PRD REQ-MKT-013 (AC-25) and REQ-MKT-002 (AC-03, AC-04).

Developer trust is the primary asset of engineering infrastructure. Misrepresenting identity or spamming communities causes immediate reputational damage that cannot be recovered with subsequent marketing.

## 2. Channel Rules Matrix (AC-25)

Every channel has distinct norms and rules that must be respected without exception:

| Channel / Forum | Rule Summary | Policy Constraints | Permitted Engagement Pattern |
|---|---|---|---|
| **Reddit (e.g. r/programming, r/typescript)** | Strict anti-self-promotion rules; typical 9:1 community ratio or outright prohibition of commercial/personal project posts outside weekly threads. | **Prohibited**: Unsolicited promotional links, creating threads solely to advertise, disguised questions ("Has anyone seen this library?"). | **Permitted**: Participating in weekly showcase threads if permitted; replying to a direct question with full maintainer disclosure if explicitly permitted by moderators. |
| **Hacker News (news.ycombinator.com)** | High bar for intellectual curiosity; strong aversion to astroturfing, promotional copy, or marketing jargon. | **Prohibited**: Asking friends/colleagues to upvote; posting promotional blogspam; concealing affiliation in comment threads. | **Permitted**: "Show HN" submissions following official Show HN guidelines (must have runnable demo/open repo); thoughtful, technically rigorous comments with disclosure. |
| **Discord / Slack Communities** | Each server maintains tailored conduct guidelines; many have dedicated `#showcase` or `#tools` channels with self-promo bans elsewhere. | **Prohibited**: Unsolicited DMs; dropping repo links into general discussion channels; automated bots posting announcement feeds. | **Permitted**: Dedicated project showcase channels following server rules; answering direct troubleshooting questions with technical explanations. |
| **GitHub Discussions** | Technical forums centered on repository issues and RFCs. | **Prohibited**: Posting off-topic promotional comments on unrelated repositories' issues or PRs. | **Permitted**: Thoughtful, collaborative RFC commentary and cross-repository standards discussions. |

## 3. Mandatory Affiliation & Disclosure Standard

Whenever contributing to public discussions, maintainers and contributors must use clear, unambiguous disclosure:

```text
[Disclosure: I am a contributor/maintainer of <product-name>.]
```

Rules for disclosure:
1. State affiliation prominently at the beginning or conclusion of the reply.
2. Never simulate external validation (sockpuppeting, astroturfing, or automated voting rings).
3. If a forum does not permit maintainer commentary on related topics, respect that boundary completely.

## 4. Value-First Contribution Rubric

A community interaction is valid ONLY if it satisfies these three criteria:
- **Technical Standalone Utility**: The comment or post provides useful architectural insights, code examples, or diagnostic criteria that help the reader even if they never adopt the supplied product.
- **Accurate Claims**: All claims reference verified capabilities (`proof_ref`) and the current frozen `context_revision`.
- **No Pressure Tactics**: Avoid urgent, sales-oriented language ("Act now", "Transform your team today"). Use measured, empirical engineering language.

## 5. Proposal-Only Prepared Output Schema

All generated engagement plans and discussion contributions are prepared drafts by default (`status: "prepared"`) and cannot authorize or perform action. Skills provide procedural guidance for agents and do not enforce host-level runtime gates. Human review and manual dispatch are required:
```json
{
  "engagement_id": "ENG-COM-001",
  "target_channel": "r/programming",
  "channel_policy_check": {
    "promotional_posting_allowed": false,
    "showcase_thread_available": true,
    "policy_notes": "Direct link posts prohibited by Rule 4. Bi-weekly project showcase thread allows open-source tool summaries."
  },
  "action_strategy": "prepare_showcase_thread_comment",
  "proposed_text": "...",
  "disclosure_included": true,
  "status": "prepared",
  "review_gate": "Requires human maintainer manual review and manual submission."
}
```
