# 0004: Agent factory controls D1-D4

## Status

accepted — 2026-11-18

## Context

A solo maintainer cannot self-approve on GitHub, so merges use a bypass path; published GitHub data showed most merged PRs had no recorded review. More parallel agent throughput without recorded review evidence and durable decision memory would push defects into published CLI, MCP, and website consumers.

## Decision

Accept four controls. **D1 (bypass policy):** keep the maintainer bypass but require `pr-gate` green and an independent-review Delivery Report in the PR body for every bypass merge. **D2 (required checks):** require `secret-scan`, `lint-and-format`, `unit-tests`, `validate-skills`, and `pr-gate`; keep the OS matrix and native-ingress advisory until flake rate is known. **D3 (size budget):** `pr-gate` warns above 1,000 authored (non-generated) changed lines unless the PR carries a `size-exception` label with a reason; report mode first, enforcement is a later owner decision. **D4 (ADR scope):** ship the ADR convention as a standard skill reference plus `design-solution`, and dogfood it here at `docs/adr/NNNN-<slug>.md` with an index and backfilled accepted decisions.

## Consequences

Every bypass merge carries recorded review evidence, and required checks are owner-applied to the ruleset rather than agent-edited. Large PRs become visible against a measured baseline (S0: authored median 1,386 lines over 100 merged PRs). Architectural decisions become durable and read before planning. No review-level grant, deployment, or publication authority changes.

## Source

[Agent factory controls, Recorded Consequential Decisions](../prd/prd-agent-factory-controls.md).
