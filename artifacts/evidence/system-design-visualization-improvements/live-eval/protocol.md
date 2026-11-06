# Live held-out evaluation protocol (frozen before execution)

Scope: AC-07, AC-08 and the held-out portion of AC-09, PR #298, slug system-design-visualization-improvements. Frozen 2026-11-06 at repository commit `fd049855938569f57512e07dd05956c3bad842b3` plus uncommitted-free tree (evidence only).

## Authorization record
- Maintainer instruction this session: close the open acceptance items in this PR; use "VMO analysis" to review and DeepSeek for implementation.
- Profile conflict disclosed to the maintainer: the VMO Analysis & Review profile says VMO projects only and never personal projects; this repository is registered Personal. The maintainer explicitly overrode that restriction. Recorded as the maintainer's decision, not an agent inference. Only synthetic prompts, the four skill files and model answers cross to the VMO Claude account; no credentials, repository source or oracle fields other than the held-out oracle supplied to the adjudicator.
- Cost cap: one pass, no retries or replacements, 16 examinee sessions + 1 calibration/adjudication session. No premium profile. Expires when this PR merges or 2026-11-13, whichever is first. Exact token cost is unavailable from the host.

## Fixed configuration
- Examinee: `omp/river/deepseek-ai/DeepSeek-V4.1-Flash-1017`, thinking `low`, mode `write`, one fresh session per prompt (16 prompts = 8 cases x base+variant). Tools: file read and the write tool only; no network or code execution requested.
- Adjudicator: `omp/anthropic/claude-opus-5-5`, thinking `medium`, separate session, never saw implementation work.
- Skills offered (isolated copies at `/tmp/ags-liveeval-skills`, byte-equal to the checkout): database-query-performance, system-design-review, system-design-data-architecture, system-design-communication. Hashes: see `skills-manifest.txt`. The examinee chooses what to read; routing is part of what is observed (no skill name appears in any prompt).
- Corpus: `benchmarks/evals/system-design-nplus1-heldout.json` sha256 `65be06fd07b333346eeb3fe9dcb0fe339e03e090216b39c2164a9cacf4568cc2`. Examinees see only prompt text, never oracle fields. A base session receives `base_prompt`. A variant session is fresh and receives `base_prompt` followed by a blank line and `Changed conditions: ` + `variant_prompt` (variants are written as follow-ups and are not self-contained). Prompts are otherwise verbatim.
- Examinee instruction template (verbatim, with `<PROMPT>` and `<CASE-ARM>` substituted): "You are a software design reviewer working alone. Reference skills are in /tmp/ags-liveeval-skills (four skill folders, each with SKILL.md and references/). Read the ones you judge relevant, in full, before answering. Do not read any other repository path, search the repository, run code or use the network. Task: <PROMPT> Write your complete answer as markdown (at most 700 words, no case id) to /tmp/ags-liveeval-answers/<CASE-ARM>.md with the write tool, then reply only: done."

## Scoring (fixed)
1. Calibration gate: the adjudicator first grades the six calibration items in the corpus without seeing `expected_verdict`; all six must match or the adjudication is INVALID and nothing is scored.
2. Each answer is graded against that case's `expected_invariant`, `mandatory_evidence` and `hard_failures` (supplied to the adjudicator only). PASS requires every mandatory item, the invariant, and no hard failure. Evidence tier language must match: code-only = suspected, design-only = risk with verification plan, never fabricated counts.
3. A case passes only if base AND variant pass. AC-09 held-out portion passes only if all 8 cases pass. Controls N1-05, N1-06, N1-07 must be classified as not amplification (or not N+1 query amplification) to pass.
4. Any examinee that reads `benchmarks/` or `artifacts/` (visible in its activity log) is excluded and reported; no replacement run.
5. Failures are reported as failures. No retry, rewording or threshold change after seeing results.

## Not claimed
Skill-attributable uplift (no no-skill arm), generalization beyond these 8 cases, runtime SQL correctness (separate SQLite fixture), human usefulness (AC-06).
