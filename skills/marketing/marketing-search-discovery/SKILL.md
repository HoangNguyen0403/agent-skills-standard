---
name: marketing-search-discovery
description: 'Audits technical discoverability, metadata completeness, and search-intent alignment while explicitly enforcing localhost and deployment evidence boundaries. Use when auditing site discoverability, structured metadata, robots/sitemaps, or search intent. (triggers: `marketing search discovery`, `search intent audit`, `technical seo discovery`, `discoverability audit`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - 'marketing search discovery'
      - 'search intent audit'
      - 'technical seo discovery'
      - 'discoverability audit'
---

# Marketing Search Discovery

## **Priority: P0 (CRITICAL)**

Audit technical search discoverability, structured metadata, and developer search intent alignment, while strictly enforcing localhost boundaries and refusing to claim external indexing or guaranteed rankings without primary deployment evidence.

## 1. Localhost & Deployment Evidence Boundary (AC-24)

1. **Explicit Unavailable State**:
   - When auditing local workspaces, staging servers (`localhost`, `127.0.0.1`, `0.0.0.0`), or static build outputs without deployed domain evidence, all external indexing and search engine status checks MUST be reported as:
     - `status: "unavailable"`
     - `reason: "localhost_indexing_unavailable"` (or `"deployment_evidence_absent"`)
   - NEVER mark external crawler indexing, Google Search Console status, domain authority, search engine ranking position (SERP), or AI model citations as "passed", "verified", or "complete" on localhost.
2. **Deterministic Offline Auditing**:
   - In offline or localhost environments, audit ONLY verifiable local static properties:
     - Semantic HTML hierarchy: Single `h1`, logical `h2`/`h3` structure, landmark elements (`main`, `nav`).
     - Core Meta Tags: `title` (≤60 chars), `description` (≤160 chars), `canonical` link structure.
     - Social & Sharing Tags: OpenGraph (`og:title`, `og:description`, `og:image`) and Twitter card tags.
     - Crawl Configuration: `robots.txt` syntax, `sitemap.xml` presence, valid absolute URL templates.
     - Structured Data: JSON-LD schema validity against Schema.org standards (e.g., `SoftwareApplication`).

## 2. Developer Search Intent Alignment

1. **Problem-Solving Intent Matching**:
   - Verify that page content directly matches developer query intent (e.g., syntax errors, CLI setup, token optimization) rather than marketing fluff.
   - Flag intent mismatches: e.g., a documentation URL promising CLI instructions that only contains generic sales copy.
2. **No Keyword Stuffing**:
   - Prohibit unnatural repetition of target keywords. Ensure technical code blocks, flags, and runnable examples take priority over repetitive text.

## 3. Proposal-Only Lifecycle & No Ranking Guarantees

1. **No Guaranteed Rankings or AI Citations**:
   - Refuse any request to promise top-10 search rankings, page-one placement, or guaranteed citations in LLMs.
   - Frame all recommendations as technical hygiene hypotheses, not guaranteed traffic drivers.
2. **Prepared Audit Reports**:
   - Emit audit findings as structured diagnostics (`state: "prepared"`, `findings: [...]`). Do not alter production routing or live DNS configurations.

## 4. Anti-Patterns & Guardrails

- **No Localhost Green Checks**: Never pass search indexing or SERP checks on local or staging URLs.
- **No Fabricated Search Metrics**: Never invent keyword search volumes or domain authority scores.
- **No Spam Tactics**: Reject hidden text, doorway pages, and keyword-bloated documentation headings.

## 5. References

- [Discovery Checks](references/discovery-checks.md) — Offline vs deployment-dependent discoverability checks.
- [Localhost Boundary](references/localhost-boundary.md) — Boundary contract, status schema, and diagnostic codes.
