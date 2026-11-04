---
asset_id: showcase-community-01
context_revision: ctx-rev-20261025-capture-ee18d7f5
state: prepared
claim_refs: ["CLM-001", "CLM-002", "CLM-004"]
official_policy_source: "https://news.ycombinator.com/showhn.html (accessed 2026-10-25)"
official_policy_quotes:
  - "Show HN is for something you've made that other people can play with. HN users can try it out, give you feedback, and ask questions in the thread."
  - "Please make it easy for users to try your thing out, ideally without barriers such as signups or emails."
  - "If your work isn't ready for users to try out, please don't do a Show HN. Once it's ready, come back and do it then."
  - "The project must be something you've worked on personally and which you're around to discuss."
---

### Proposal: Hacker News Show HN Submission

> **Status**: Prepared proposal (`state: prepared`) | **Action**: `propose`
> *Requires human maintainer review and manual submission. No automated posting is authorized.*

#### Channel Policy Reading (AC-25)

Quoted directly from the official guidelines, accessed 2026-10-25:

1. *"Show HN is for something you've made that other people can play with. HN users can try it out, give you feedback, and ask questions in the thread."*
2. *"Please make it easy for users to try your thing out, ideally without barriers such as signups or emails."*
3. *"If your work isn't ready for users to try out, please don't do a Show HN. Once it's ready, come back and do it then."*
4. *"The project must be something you've worked on personally and which you're around to discuss."*

Reading, not a quotation: the guidelines do not state a "public repository" rule. The operative requirement is that readers can **try the thing out** without barriers, and that the submitter personally worked on it and is present to discuss.

**Two separate conditions gate this proposal:**

| Condition | Source | Status |
| --- | --- | --- |
| Tryable without barriers | HN guidelines (quoted above) | **Not satisfiable yet** — candidate packages are not published; a reader cannot run `ags` from a released source |
| Personal work + present to discuss | HN guidelines (quoted above) | Maintainer attestation required at submission time |
| Released, installable artifact | **Our own** release condition (`AC-16`), not an HN rule | **OPEN** — requires a maintainer tag/release on the remote registry |

Because condition 1 cannot be met until our release gate closes, this draft stays `prepared`. Submitting now would ask readers to try something they cannot obtain, which the quoted guidance explicitly discourages.

**Rejected channel alternatives (AC-20)**:
- *Reddit r/programming*: rejected. Its self-promotion rules restrict direct promotional link submissions; eligibility was not established from a dated official policy read, so it is not used.
- *Discord / Slack general developer channels*: rejected. Unsolicited promotional links in general discussion channels are a conduct problem regardless of posted rules.

**Proposed Submission Title**: Show HN: Agent Skills Standard – one config for Claude Code, Cursor, and Codex rules

**Proposed Submission URL**: `https://github.com/HoangNguyen0403/agent-skills-standard` *(only after a maintainer release is cut)*

**Proposed Top-Level Submission Comment**:

```text
[Disclosure: I maintain agent-skills-standard.]

Hi HN,

Teams using more than one AI coding tool end up maintaining the same rules in
several formats. agent-skills-standard (CLI: ags) generates the native structures
each tool expects from one .skillsrc, using pinned skill packages.

How it works — you declare agents and pinned skill tags:

registry: "https://github.com/HoangNguyen0403/agent-skills-standard"
agents:
  - claude
  - cursor
  - codex
skills:
  typescript:
    ref: "typescript-v1.3.4"
  product-management:
    ref: "product-management-v1.0.1"
mcp:
  enabled: false
  scope: disabled
  prompted: true
telemetry: false

ags sync then writes .claude/skills/, .cursor/skills/, .codex/skills/, a
.skills-lock.json with sha256 per file, and a root AGENTS.md router that tells the
agent to read the matching SKILL.md before editing code.

What is different:
- File-based and open source (Apache-2.0). No dashboard, no login, no fee.
- Evaluation fixtures stay out of consumer installs: in our captured run, 0 of
  407 installed files were under evals/.
- A lockfile pins exact revisions per file so teammates converge.

One caveat up front: "Don't claim agent compliance because files exist." Rule
files steer a model; they do not verify obedience. Keep tests and linters in CI.

Feedback wanted on the .skillsrc schema and the multi-agent directory layout.
```

**Copy constraints carried from the proof register**:
- Only the three exercised agents (Claude Code, Cursor, Codex) may be named; `windsurf`/`gemini`/`copilot` were not run.
- No retention, ROI, market-size, or "proven" claims; the scorecard works on synthetic fixtures only.
- No claim that MCP is required or installed: in this configuration it is explicitly off.
- The maintainer must personally attest to the quoted "worked on personally / around to discuss" condition before submitting.
