# Stopped Evaluation Run Provenance

## Run Identity and Provenance

- **Original Run Directory**: `benchmarks/evals/runs/marketing-v2.6.6-2026-10-25T08-37-41-103Z-7c90e94d/`
- **Archived Directory**: `artifacts/evidence-led-marketing/stopped-evaluation/`
- **Execution Date**: 2026-10-25
- **Execution Profile**: `google-antigravity/gemini-3.8-flash` via OMP, mode `write`, thinking option `medium`, maximum 246 attempts, concurrency 1.
- **Consumption**: Exactly 2 of 246 attempts consumed; remaining 244 attempts stay unlaunched.
- **Arm 1 (Baseline)**: `answers/marketing-audience-research/eval-1.baseline.md` and audit `answers/marketing-audience-research/eval-1.baseline.audit.json`.
- **Arm 2 (With-Skill)**: `answers/marketing-audience-research/eval-1.with-skill.md` and audit `answers/marketing-audience-research/eval-1.with-skill.audit.json`.

## Technical Caveats and Decision Boundaries

1. **Explicit Stop Decision**: Evaluation was stopped at the current host boundary by explicit user decision (`artifacts/evidence-led-marketing/evidence/evaluation-stop-decision.md`).
2. **Comparability Unverified**: Effective base-system-prompt digests differ between the baseline arm (`eeac76188b70c604`) and the with-skill arm (`94bfb0be2237f68e`). Historical prompt arrays were not recovered in the live host daemon. Clean event audits do not establish isolated or causal efficacy.
3. **No Results/Score Fabrication**: No `results.json` or v2 `inputs.json` was authored or fabricated. Because CI `evals:verify --all` enumerates directories under `benchmarks/evals/runs/` and requires completed `results.json` + `inputs.json`, the original run directories under `benchmarks/evals/runs/` are excluded from git staging, and this archive preserves the raw public run artifacts byte-for-byte outside the benchmark runner tree.
4. **No Efficacy Claim**: No skill-efficacy delta, benchmark pass rate, or superiority claim is made from these two bundled outputs.
5. **Privacy Boundary**: Public answers and audit records contain digests only. Unchanged raw sessions, daemon logs, and full-audit files remain strictly outside the repository under private host evidence storage (`~/.paseo/evidence`) and are not included.
