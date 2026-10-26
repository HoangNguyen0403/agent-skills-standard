# Book-to-skill large-source delegation implementation plan

## Goal and authorization

Extend PR #254's reusable book-to-skill skill so a main agent can coordinate large authorized sources without loading the whole book. User selected delegated implementation. Personal agent-skills-standard; current feat/reusable-book-to-skill worktree. No deployment, merge, paid external services, source-book redistribution, or permanent PDF runtime is authorized.

## Design

Use available tools for mechanical extraction once; use bounded semantic workers for interpretation and synthesis. A diagnostic/visual worker is conditional on extraction defects, not a default full-book reader. Keep one coordinator, non-recursive workers, independent review, and artifact-based handoff. Source page labels and PDF page IDs remain distinct. Packet overlap supplies context but never duplicates canonical ownership.

The coordinator keeps a compact source/packet ledger and retrieves targeted evidence instead of accumulating all worker transcripts. Token budgets include instructions, source, dependencies, and output reserve. Concurrency and limits are explicit choices based on observed pilot usage and host/account authorization, not promised savings or prompt-enforced caps. Workers lacking runtime support fall back to bounded sequential processing, not whole-book ingestion.

## Contracts and acceptance

- AC1: Entry links a focused lazy large-source reference; stays <=100 lines, description <=300 characters, qualified triggers unchanged.
- AC2: Reference distinguishes tool extraction, conditional diagnostic/visual workers, packet synthesis, coordinator integration, and independent review.
- AC3: Packets name immutable source identities, exact locators, canonical ownership vs context-only overlap, dependency slices, output targets, permissions, limits, and escalation conditions.
- AC4: Results name saved artifacts, source locators, semantic dispositions, unresolved dependencies, extraction defects, checks and observed usage. No recursive delegation or shared canonical writes by workers.
- AC5: Coordinator reconciles coverage, vocabulary, cross-packet dependencies/conflicts against source; repairs only affected packets; preserves accepted outputs and review limits. No full-output re-paraphrase at assembly.
- AC6: Verification cases cover cross-packet exceptions, broken table relationships, duplicate ownership, incomplete results, missing definitions, and sequential fallback. Judge semantic outcomes, not lexical anchors.
- AC7: Exercise actual bounded worker reads and synthesis on an original synthetic source, plus independent fidelity review. Record actual reads and observed limitations; do not claim 600-page scalability, savings, or a baseline win from a small smoke.
- AC8: Scoped official projection regeneration, per-path parity, focused formatting, structural validation and discovery/retrieval checks pass or are reported with original failures preserved. No hand-edited mirrors, generator fixes, unrelated cleanup, or release.

## Ownership and sequence

1. Guidance author: owns skills/common/common-book-to-skill/SKILL.md and new references/large-source-delegation.md only. Implement AC1-5 using existing standards. No tests/generation/formatters while authors are active.
2. Verification author (independent parallel slice): owns references/verification-and-handoff.md and external /tmp/book-to-skill-delegation/fixture/ only. Add AC6 cases and create original synthetic multi-packet source plus independent expected-outcome rubric. Do not change existing baseline/assisted-correction history. No commands/checks while writing.
3. Independent reviewer: read settled sources and contract; review AC1-6 and semantic boundaries, no implementation ownership. Separately exercise source packets through bounded readers and compare integrated outcomes to rubric. Any paid provider/external tooling remains outside authorization.
4. Integration owner: after all source writers settle, update relevant category/changelog only if existing conventions require, format, officially regenerate scoped exports using generator safeguards, validate parity/discovery/structure, and report AC results.

Workers first read AGENTS.md and load applicable skills; never spawn other agents or change scope. Report exact changed paths, readback evidence, gaps, and unresolved decisions. Operational receipts stay outside .agent because generators may migrate legacy evidence.

## Verification strategy

Freeze fixture source and rubric before candidate application. Preserve original PR baseline unexpected-green and candidate PARTIAL/assisted-correction history; these are not RED evidence for this change. Use outcome-based source comparison, actual artifact reads, structural checks, and resource/deployment rights as separate claims. Test small semantic fixture and modest packet scheduling behavior; an unexecuted larger stress experiment remains unverified rather than being simulated by filler pages. Record usage only if exposed; unavailable fields remain unavailable.

## Non-goals

No new converter, parser, runtime, agent registration, recursive worker tree, executable eval runner, lexical assertions, hardcoded tokenizer/provider/cost cap, private BABOK data, source-book copying, automatic install/publication, unrelated product ceremony, commits, push or PR mutation.
