# Requirements Standards Baseline

This baseline defines where BRD, PRD, and SRS/FRS workflow guidance is derived from.

## Why You Can Trust This Baseline

- It is derived from public, widely-used requirements/specification references (product, engineering, standards bodies).
- SDLC workflows and skills link to this file so users can audit where the guidance came from.
- Teams can override local conventions, but changes should update this baseline so the repo stays self-explaining.

## Primary References (Provided For This SDLC Upgrade)

- BRD / PRD / SRS / FRS comparisons:
  - https://www.bacs.vn/vi/phan-biet-cac-tai-lieu-brd-vs-srs-vs-frs-8783.html
  - https://medium.com/@mubasirsiddiqui9/brd-prd-mrd-srs-frs-which-product-docs-should-you-actually-care-about-1b27f1ed2561
  - https://www.findernest.com/en/blog/understanding-prd-brd-mrd-and-srd-a-quick-guide
  - https://dipbagchi.wordpress.com/2019/03/06/brd-prd-trd-the-case-of-the-confusing-requirements/

## BRD (Business "Why")

- Business requirements structure and stakeholder/value framing:
  - https://techwhirl.com/business-requirements-document-brd-template/
  - https://www.pandadoc.com/business-requirements-document-template/
  - https://www.lucidchart.com/blog/tips-for-a-perfect-business-requirements-document
  - https://www.inventive.ai/blog-posts/business-requirements-document
- What this repo adopts:
  - BRD captures stakeholder input, SMART objectives, AS-IS/TO-BE context, scope, cost-benefit/value hypothesis, glossary, and validation owners.
  - BRD stays solution-free; functional behavior routes to PRD or SRS/FRS.
  - Complex current/future processes should include a lightweight Mermaid diagram.

## PRD (Product "What")

- Product requirements and living-spec practice:
  - https://www.atlassian.com/agile/product-management/requirements
  - https://www.atlassian.com/software/confluence/templates/product-requirements
  - https://www.jamasoftware.com/requirements-management-guide/writing-requirements/product-requirements-document/
  - https://pharos-solutions.de/blog/product-requirements-document-guide/
  - https://www.uladshauchenka.com/p/how-to-write-a-good-product-requirements
- What this repo adopts:
  - PRD is an alignment artifact for goals, users, scope, use cases, acceptance criteria, NFR cues, analytics, risks, rollout, decisions, and changelog.
  - Acceptance criteria should be verifiable, preferably Given/When/Then when behavior can be misread by engineering or QA.
  - User stories must use specific actors, clear business value, and INVEST-style quality checks before handoff.

## SRS/FRS (Technical "How")

- Requirements engineering and specification discipline:
  - https://standards.ieee.org/ieee/29148/6937/
  - https://standards.iteh.ai/catalog/standards/iso/8cf2bc2b-8b5e-4907-a82a-d1c5676c9e85/iso-iec-ieee-29148-2018
  - https://swehb.nasa.gov/pages/viewpage.action?pageId=16454822
  - https://raw.githubusercontent.com/RafaelGorski/Problem-Based-SRS/main/skills/problem-based-srs/SKILL.md
  - https://aravindakumar.medium.com/automating-srs-creation-with-agentic-workflows-unlocking-seamless-consistency-and-productivity-f2aff2efc861
- What this repo adopts:
  - SRS preserves problem-to-need-to-requirement traceability: `BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> test evidence`.
  - Requirements are written as measurable cards with priority, status, source, behavior, failure modes, NFRs, measurement method, and verification lane.
  - Complex flows use use-case discipline: one actor, one goal, one session; normal course separated from alternatives and exceptions.

## Cross-Cutting Requirement Quality

- Requirement writing quality and traceability:
  - https://www.incose.org/docs/default-source/working-groups/requirements-wg/gtwr/incose_rwg_gtwr_v4_040423_final_drafts.pdf?sfvrsn=5c877fc7_2
  - https://www.ibm.com/docs/en/ewm/6.0.6?topic=SSCP65_6.0.6.1/com.ibm.rational.rrm.help.doc/topics/c_trace.htm
  - https://www.jamasoftware.com/requirements-management-guide/requirements-traceability/traceability-matrix/
  - https://addyosmani.com/blog/good-spec/
  - https://raw.githubusercontent.com/phucnt-bazone-vietnam/ba-zone-user-story-ac-writer/main/SKILL.md
  - https://raw.githubusercontent.com/phucnt-bazone-vietnam/use-case-writer/main/SKILL.md
- What this repo adopts:
  - AI-readable specs use explicit Markdown sections, commands, boundaries, validation gates, and living-document changelogs.
- **Slug Alignment Protocol**: To maintain traceability across dozens of features, all related requirement layers MUST use a consistent `[slug]` in the filename.
  - Business: `docs/brd/brd-[slug].md`
  - Product: `docs/prd/prd-[slug].md`
  - Technical: `docs/srs/srs-[slug].md`
