description: Run blinded live skill evals and publish reproducible v2 results.

# Goal

Measure whether a skill changes agent behavior with isolated, immutable, outcome-based eval evidence.

# Steps

## 1. Choose or resume a run

- Use `pnpm evals:manifest -- --category <category>` for one category or `pnpm evals:manifest -- --all` for the complete catalog.
- Use `pnpm evals:manifest -- --resume <runId>` only when deliberately continuing an existing run; a new invocation always creates a collision-safe run ID.
- Record the printed run ID. The manifest records source hashes, the v2 schema, and the generation protocol.

## 2. Answer each blinded case

- Run each baseline and with-skill arm in a separate worker/context.
- Baseline receives only the prompt. With-skill receives the same prompt plus that skill's `SKILL.md`.
- Trigger cases receive only the skill name and one-line description; never open the full skill body or expose the expected label.
- Trigger prompt filenames use opaque case IDs; never infer the expected label from filenames or ordering.
- For `all` runs, write answers under `answers/<category>/<skill>/<case>`; category runs use `answers/<skill>/<case>`.
- Mark known compromised baselines in the manifest and do not use them for delta calculations until clean reruns replace them.

## 3. Complete and score

- Fill `metadata.agent`, `metadata.model`, and `metadata.completedAt` after every required answer exists.
- Run `pnpm evals:score -- --run <runId>`.
- Scoring refuses to write `results.json` while any arm is pending, verifies source hashes, and writes one immutable `inputs.json` snapshot before publishing v2 results.

## 4. Report and verify

- Run `pnpm evals:report` to project aggregate runs into the newest complete category partitions and update physical history/archive records.
- Run `pnpm evals:verify -- --run <runId>` and, before handoff, `pnpm evals:verify -- --all`.
- Confirm case pass rate, assertion pass rate, trigger recall, trigger specificity, and balanced trigger accuracy. Treat baseline and delta as `n/a` for compromised arms.
- Never hand-edit `results.json`, transcripts, history, or archives. Fix inputs or eval definitions and regenerate.

# Output

## Run Summary

## Evidence

## Known Risks

## Outcome Report

feature_status: implemented | partially_implemented | blocked
requirement_trace: manifest -> inputs -> results -> report -> verification
completed_evidence: []
missing_evidence: []
decision_needed: []
recommended_next_workflow: verify-work
