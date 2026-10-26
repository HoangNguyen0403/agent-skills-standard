# Initial settled verification checkpoint

Source baseline: 92d06c420f6a41f08e11579423e4e3eacdb7880d plus candidate files documented in original task review packages. Initial owner revisions have since received corrective assignments; these results must not be misrepresented as verification of later changes.

- Lockfile install: pnpm install --frozen-lockfile exit 0, 986 packages. Build scripts for @parcel/watcher, @scarf/scarf, esbuild and unrs-resolver were ignored by pnpm; not a build-completion claim.
- Actual canonical SkillIndex smoke: passed nine negative/positive/mixed-intent queries. Baseline four skill files loaded from the original git commit, not a reconstructed claim. Result: routing-smoke-result.json.
- MCP command unexpectedly selected the whole package suite, not just the named spec: 13 files, 241 tests passed. Preserve exact command in checks-result.json.
- SDD Python suites: 42 passed; deliberate negative-fixture diagnostics in output are expected test evidence.
- test:evals, evals:audit, audit:keywords, audit:skills, audit:sdlc, check-alignment, docs:capabilities:check exited 0.
- validate exited 1: dead relative capability link in SDD SKILL.md. Capability skill description 493 chars generated a warning. Returned to original owners.
- Actual scorer adverse-candidate smoke exited 1: 13/13 explicitly unsafe candidates passed both assertion semantics; all safe candidates passed v2. These are lexical false positives, not model behavior observations. Returned all pressure-rubric cases to original owners for correction.
- No paid/live model evals performed. No monetary savings evidence.
- Independent reviewer repeatedly returned Codex capacity error turn_rate_limit_exceeded. Further retries have only been sent on explicit user requests; no review verdict is inferred from these failures.
- Task 1/2 correction in progress; Task 3 source stopped. Integration remains dependent on accepted source/review receipts.
