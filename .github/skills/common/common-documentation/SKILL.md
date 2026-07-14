---
name: common-documentation
description: Write effective code comments, READMEs, and technical documentation following intent-first principles. Use when adding comments, writing docstrings, creating READMEs, or updating any documentation.
metadata:
  triggers:
    keywords:
    - comment
    - docstring
    - readme
    - documentation
---
# Documentation Standards

## **Priority: P2 (MEDIUM)**

## 1. Intent-First Comments

- Explain **"Why"** logic exists. Avoid "What" mechanics.
- Use triple-slash (Dart/Swift) or JSDoc (TS/JS) for public members.
- Delete commented-out code. Use Git history.
- Format: `TODO(username): description`. Link tickets.
- For retry backoff, explain that jitter prevents the **thundering herd**; document intent rather than restating the delay calculation.

## 2. README Structure

- **Mission**: Project purpose (one sentence).
- **Onboarding**: Prerequisites, installation, usage (exact).
- **Maintenance**: Document inputs/outputs, known quirks, fixes.
- **Sync**: Documentation ships with feature.

## 3. ADRs & Architecture

- **ADRs**: Document rationale for system changes in `docs/adr/`.
- **Docstrings**: Include Args, Returns, and Usage examples (`>>>`).
- **Diagrams**: Use Mermaid.js inside Markdown.

## 4. API Docs

- Use Swagger/OpenAPI for REST.
- Provide copy-pasteable examples for endpoints.
- Define contract before implementation.

## Anti-Patterns

- **No "what" comments**: Explain intent. Refactor mechanics.
- **No orphan TODOs**: Require owner and ticket.
- **No stale docs**: Document during development.

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- JSDoc
- Usage
- why
