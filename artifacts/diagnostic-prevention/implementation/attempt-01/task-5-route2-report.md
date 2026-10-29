# Task 5 route 2: Evaluator and discovery/publication standards (S03, S06)

**Status:** FINAL (source frozen). Every dependent oracle is frozen; the matrix reads those exact bytes at run time.
**Canonical input identity (parent `shasum -a 256`, recorded in `canonical-oracle-inputs.json`):**
- `common-tdd/evals/evals.json` `812b77f7…a8a29`
- `common-subagent-driven-development/evals/evals.json` `63bf0d7e…375c6`
- `common-learning-log/evals/evals.json` `de9b3f11…722751`
- `common-session-retrospective/evals/evals.json` `d394bcfa…f48d`
- `common-security-standards/evals/evals.json` `bb158ad5…fd2592`
- `common-web-visual-testing/evals/evals.json` `09e39b39…642917`
- `common-telemetry/evals/evals.json` `26681711…9989da`

These are content identities for the fixed inputs, not a replacement evaluation manifest: verifier/manifest binding remains the existing verifier authority (`snapshot.ts`, `evals-v2.test.ts`), and this suite claims no binding result.
**Route:** Personal – DeepSeek (route 2). Supersedes the stopped `19dd21a9` attempt.
**Workspace:** `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`, branch `feat/diagnostic-prevention-improvements`, base `52ac482a5b948d9d26df4c3a2617afec74d1cf54`.
**Original pre-implementation RED:** NOT RUN. **Executed test totals:** NOT RUN — no run of this suite has been observed and no pass count is claimed.
**Execution:** no delegation, commits, tests, builds, lint, formatters, model trials, generators, metadata or mirror edits, and no shell permission requests.

## 1. Owned changes

1. `scripts/evals/diagnostic-prevention.test.ts` — a scorer-behaviour matrix over 28 canonical cases, each resolved from disk at run time and scored with the real `checkAssertion`. Both published semantics versions are scored per control and must agree, so no verdict depends on which version a runner uses. Transcripts are authored and adjudicated here; independence is authorship evidence, not a runtime assertion (there is deliberately no `transcript !== expected_output` check — a finite enumerated contract can legitimately produce identical correct fields, and padding a `NOTES:` to differ would be answer-anchor cheating).
   - **Removed:** the raw-byte SHA-256 / `placeholder_skill_hash` demonstration, the `should_not_trigger` keyword-array test, and both source-shape tests I had added (single-regex count, prompt-declared field/order equality). Nothing asserts source wording, prompt text, field order or file layout; only scorer verdicts on independent answers are graded, so a future correct multi-assertion implementation cannot fail merely because its assertion count or type differs.
   - **Retained:** a fixture-integrity guard only — case resolves, ≥1 assertion, both polarities, unique names, non-empty transcript and rationale.
   - **Coverage:** 15 Task 4 cases (security 4–11 incl. new replay/revoke 11, browser 3–6, telemetry 3–5 with `TOKEN_INPUTS`/`LINEAGE_SCOPE`) and 13 Task 2/3 cases (TDD 4/5/7/8/9, SDD 4–9, learning-log 5, retrospective 5). Both packages now grade each case with a whole-response shape assertion admitting every listed value plus one independent predicate per field asserting that field's safe value; no `not_contains` remains in any of these files. Consequences the matrix exercises explicitly: an unsafe listed value passes the shape and fails exactly its field predicate; a duplicate, unknown field, omitted field or unlabelled tail fails the shape while the safe predicates still match. Field-order and `NOTES:`-terminality differences between the two packages are reflected in the CRLF controls (Task 4 permits only `\r?\n` between fields, so its CRLF variant is unindented; Task 2/3 tolerate leading whitespace after newlines).
   - **Authored matrix scope (none executed):** 28 canonical case IDs — 13 Task 2/3 (`common-tdd` 4/5/7/8/9, `common-subagent-driven-development` 4–9, `common-learning-log` 5, `common-session-retrospective` 5) and 15 Task 4 (`common-security-standards` 4–11, `common-web-visual-testing` 3–6, `common-telemetry` 3–5) — and 207 authored control transcripts: 196 base (7 per case) plus 5 CRLF accept variants and 6 reorder reject variants. Each case yields one test with one subtest per control; every control is scored at v1 and v2.
   - **Control classes per case:** exact fields (accept); quoted unsafe claim in `NOTES:` (accept); paraphrased `NOTES:` (accept); duplicate graded field carrying its unsafe value (reject); unlabelled tail line (reject); one field at its unsafe listed value (reject); one declared field omitted (reject, and it must fail a required positive assertion — all these assertions are `regex`); CRLF variant (accept, indented only where the contract tolerates it) and reordered fields (reject) on representative cases.
2. `skills/common/common-skill-creator/SKILL.md` — oracle bullet also forbids encoding a decision as a bare substring ban on wording a compliant refusal may quote. 98 lines.
3. `skills/common/common-skill-creator/evals/evals.json` — stale ≥80% target reconciled to `scripts/evals/readiness.ts` (`ACTIVATION_THRESHOLD = 0.9`, recall + specificity): case 3 `expected_output`/assertion now `90%`; the description-optimization pressure assertion is `["trigger","90%","should_not_trigger"]`. Stricter value from existing authority, not a relaxation or scanner dodge; the other `80%` in `references/web-search-research.md` is the unrelated Pareto rule.
4. Round-1 accepted items retained verbatim: publication preflight scoped to registry/native-export contracts, search-absence vs capability, private path/link and one-way manifest review, warnings/skips/NOT RUN separation, publication vs activation, NOT RUN preservation.

No peer JSON, `skills/metadata.json`, mirror, dependency or host configuration was touched.

## 2. Expected outcomes (static hand-verification, not executed)

Hand-checking each authored transcript against the actual frozen patterns predicts every control on its adjudicated verdict: accepts pass (exact fields, quoted `NOTES:`, paraphrased `NOTES:`, CRLF/indent) and rejects fail the pattern (duplicate field, unlabelled tail, unsafe value, omitted field, reordered fields). The two failure classes reported against earlier oracles are now structurally impossible for these packages:

- `not_contains` no longer exists in the security, browser, telemetry, TDD, SDD, learning-log or retrospective contract cases, so a refusal that names the prohibited action is no longer punished (earlier false negatives: `implement production code immediately`, `run broad pkill now`, `fake expected_red`, `report PASS for the partial suite`, `prior proof remains valid`).
- Correct decision lines followed by a contradictory tail no longer pass (earlier false positives across all 13 Task 2/3 cases, and the Task 4 duplicate-key/tail admissions).

**Declared scope limit, from the owners and preserved:** `NOTES:` is ungraded free text. A correct field block followed by unsafe prose in `NOTES:` is not rejected by these contracts; this suite neither asserts that case nor relabels such an answer safe. The matrix is finite calibration, never a semantic-safety guarantee.

## 3. Verification

**NOT RUN** — no command output observed for any version of this file; no totals claimed.

Parent-attributed, not produced here: the scoped quality/alignment audit over all 28 scenario IDs plus creator case 3 reported 0 issues (`scoped-eval-gates-run-01.json`). That is a scoped eval-definition gate, not a scorer run of this matrix, not a full registry audit, and not model evidence.

Parent gate:

```bash
rtk proxy node --import tsx --test scripts/evals/diagnostic-prevention.test.ts scripts/evals/assertion-parity.test.ts scripts/evals/quality.test.ts
```

Parent-owned, not executed here: eval audit over the edited `common-skill-creator/evals/evals.json` (the `90%` assertion stays anchored in that case's `expected_output`) and JSON parse validation of that file.

## 4. Claims deliberately not made

- **Digest / manifest binding** and **routing / activation** proofs belong to the existing verifier tests (`scripts/evals/snapshot.ts`, `evals-v2.test.ts` resource-mismatch and promotion cases) and to the router's own tests plus a real run. This suite added no replacement and removed the tautologies that pretended otherwise.
- **No model efficacy**, no semantic-safety guarantee, no host-enforcement claim.
- **Static verdicts.** Owners' assertion changes can only shift which assertion fails, which the matrix never asserts; partial controls additionally require a positive-assertion failure.
- **Dependency exposure is intentional:** it fails wherever an oracle accepts an unsafe/malformed answer or rejects a compliant one.

## 5. Changed paths

- `scripts/evals/diagnostic-prevention.test.ts`
- `skills/common/common-skill-creator/SKILL.md`
- `skills/common/common-skill-creator/evals/evals.json`
- `artifacts/diagnostic-prevention/implementation/attempt-01/task-5-route2-report.md` (this report)
