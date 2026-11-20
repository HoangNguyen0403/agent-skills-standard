# Brief: Add NVIDIA SkillEvaluator To The Skill Guard, Then Fix What It Finds

slug: skillevaluator-guard
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
approval: approved(requesting maintainer, 2026-11-18)
repository_status: approved_brief_saved
activation_status: not_required

SNC: S=2 N=2 C=2 total=6 tier=high (inference from a repository scan and one keyless local probe, not a scouted blast radius). Spread: CI workflows, `cli/src/services/validation/*`, `skills/**` content. Novelty: a new third-party evaluator. Centrality rounded up: the guard gates every skill release, and running third-party code in CI crosses a supply-chain trust boundary. The capability hint authorizes no premium spend.

Source revision inspected: `11c8bd1a72be5935bafbd45c63d8236baab804fb`, clean tree. Account domain: Personal (settled, `docs/brd/brd-ags-improvement-criteria.md:165`).

Relation to approved work: `brd-skill-system-effectiveness.md` owns with/without-skill lift and the L3 executable lane. `brd-agent-eval-trajectory-evidence.md` owns behavior grading. Neither is reopened. SkillEvaluator Tier 3 (live lift) overlaps them and is out of scope here.

## Decision Card

- **Outcome:** Our guard catches the defect classes SkillEvaluator found that it currently misses, and the 3 broken skills are fixed. A pinned, keyless SkillEvaluator audit, scoped to one version, reports what that version finds and our guard does not. Newer upstream rules arrive only through a reviewed version bump.
- **Recommendation:** Option A. (1) Add an H1 to the 3 skills that fail on HIGH. (2) Add 2 rules to `SkillValidator`: H1 present (error), and a trigger phrase within the first 60 description characters (warning by default, D3). (3) Add fixtures proving that duplicate keys and descriptions over 1,024 UTF-16 units already fail. (4) Add a pinned, hash-locked `skillevaluator==1.0.1` Tier 1 job: manual dispatch and advisory on PRs, with a policy overlay and read-only permissions. (5) Publish a check-by-check gap table.
- **Strongest objection:** Ported rules can drift from upstream. And unless someone reads the advisory job, the PR path still misses SkillEvaluator's harness profiles and script scanners.
- **Reversal condition:** If the full-scanner probe finds real script, PII, or license defects, or a regression the advisory job flagged reaches `main`, raise a scoped proposal to adopt Option B. Nothing becomes blocking without approval (D2).
- **Non-goals:** Tier 2/3, LLM or paid checks, boilerplate sections added to raise the score, removing SkillSpector.
- **Impact if wrong:** Either one more ignored CI job, or a duplicated rule set that drifts from upstream.
- **Open decisions:** none. The approval settled D1–D3 at their recommended defaults: D1 (a), D2 (a), D3 (a).
- **Approval:** granted 2026-11-18 for this brief and the Option A first plan only. It carries no implementation, spend, or release authority.

## You Said / I Assumed

**You said:** Look at how to integrate https://github.com/NVIDIA/SkillEvaluator into our guard, verify it, and improve the weak spots.

**I assumed:**

- "Our guard" means the CI checks that gate skill content: the `validate-skills` job in `.github/workflows/ci.yml:155-243` (`pnpm validate` → `cli/src/services/SkillValidator.ts`, `audit:injection`, `check-alignment`, `evals:gate`), plus `skillspector-scan.yml` and `harness-smoke.yml`. It does not mean `specialist-architecture-guard`.
- "Verify" means running SkillEvaluator against this catalog and checking whether its findings are real. "Weak spots" covers both the skill defects it finds and the coverage gaps in our guard (D1).
- Sponsor and decision-maker: requesting maintainer. Validation owner: an independent reviewer on the Personal analysis profile, plus the maintainer. Both are proposals.
- Success example (agent-proposed): a PR adds a skill with no H1 title, and `pnpm validate` fails before merge. A later SkillEvaluator audit run reports a new upstream harness rule we don't cover yet.
- Anti-goal (agent-proposed): bulk-adding `## Troubleshooting`/`## Limitations`/`## Examples` sections to all 354 skills to raise the quality score.

## Contract

**Outcome:** as in the Decision Card.

**Constraints:**

- Supply chain (assumed; mirrors `.github/workflows/skillspector-scan.yml:58-78`): lock and hash the complete SkillEvaluator dependency set and every scanner it downloads, not only the top-level package. The job runs with `contents: read`, no secrets or model keys, and no `pull_request_target` or other privileged trigger. It never executes candidate skill scripts. Report upload must not raise scanner permissions; the existing SkillSpector job holds `security-events`/`issues: write` (`skillspector-scan.yml:45-48`), and this job does not.
- `INCOMPLETE` or a scanner that fails to run is reported as not run, never as a pass. (confirmed rule, SkillEvaluator Tier 1 docs; matches `skillspector-scan.yml:174-175`)
- No mass rewrite to fit SkillEvaluator's style rules. Token economy wins (`AGENTS.md:7`). (assumed)
- The `guardrail` frontmatter field stays where it is. Tooling reads it (`scripts/audit-skills.ts`, `mcp/src/retrospective/*`), so the overlay allowlists it rather than moving it. (confirmed usage)
- Released CI templates have no custom-policy input, so the job calls the CLI directly. (confirmed, Tier 1 docs)
- Ported rules live in `cli/src/services/validation/interopRules.ts` beside the existing agentskills.io rules. No second validator. (assumed; follows existing pattern)
- "Near the start" means within the first 60 characters of `description`, matching SkillEvaluator's `description_trigger` rule. (confirmed, Tier 1 docs schema section)
- A SkillEvaluator version bump is a reviewed PR that reruns the audit and updates the gap table. There is no automatic upstream tracking. (assumed)

**Non-goals:** Tier 2 dedup and Tier 3 live evaluation (paid, Docker, overlaps the approved L3 lane); `--llm` Tier 1; hosted report publishing; adding `metadata.author`/`tags` to every skill; replacing `scripts/evals`; changes to the SkillSpector workflow under this brief.

**Acceptance criteria** (all assumed; the request stated none):

1. AC1: The 3 skills fixed in AC3 pass `skillevaluator validate --tiers 1 --checks schema` with 0 HIGH/CRITICAL findings across the catalog.
2. AC2: `pnpm validate --all` fails on seeded fixtures with a missing H1, a duplicate frontmatter key, and a description over 1,024 UTF-16 units (one fixture must use supplementary-plane characters). A description without a trigger phrase in its first 60 characters produces a warning (or an error if D3 selects b). Verified by a run.
3. AC3: `common/common-context-optimization`, `nestjs/nestjs-security-isolation`, and `nextjs/nextjs-app-router` gain an H1 and pass both validators.
4. AC4: A gap table maps each SkillEvaluator Tier 1 check (schema sub-checks, version, security, pii, license, code-integrity, unicode, quality, lint, harness, dependency) to our guard as covered, ported, advisory-only, or not applicable, with path evidence.
5. AC5: A pinned SkillEvaluator job runs keyless on manual dispatch and as a non-blocking check on PRs touching `skills/**`. Any extra schedule is a planning decision; no cadence is proposed here. It uploads the JSON report and lists `INCOMPLETE` scanners explicitly. When no JSON is produced, the job keeps the CLI log and exit code as diagnostics. It has no exit-code or quality-score gate on the PR path. Promotion to blocking needs a separate approval (D2).
6. AC6: A versioned policy overlay records every severity override with a one-line reason. It never downgrades schema, security, PII, license, or unicode HIGH/CRITICAL findings.

## Direction Options And Recommendation

**A. Fix, port cheap gaps, and run SkillEvaluator as an advisory differential audit (recommended).**
- Load-bearing assumption: the defect classes that matter here (H1, trigger placement) are small, stable rules that are cheap to own, and the fast-moving parts (harness profiles, scanners) can stay advisory.
- Evidence limits: security, PII, license, code-integrity, and dependency checks were not run in the probe because scanners weren't installed, so their signal on `references/`/`scripts/` is `unknown`. Duplicate-key behavior has a code path (`rules.ts:58-66`) but has not been run.
- Decisive trade-off: no third-party code on the blocking path, at the cost of owning 2 small rules that can drift from upstream.
- Proof: AC1–AC3 pass; seeded fixtures behave as AC2 states; the advisory job uploads a report on dispatch.
- First failure: the advisory report goes unread.
- Worst plausible case: a script-level secret or unsafe script in `skills/**/scripts/` merges because the only scanner that would catch it is advisory.
- Cost to abandon: revert 2 rules and the fixtures, and delete one workflow.

**B. SkillEvaluator Tier 1 as a blocking PR gate with overlay.**
- Load-bearing assumption: the overlay mutes style noise (4,741 findings in the probe, most of them style rules) without hiding defects, and full scanners are clean enough to block on.
- Trade-off: maximum upstream coverage, including harness profiles and script scanners, against a required Python toolchain and third-party code on every skill PR.
- Proof: green on fixed `main`, red on each seeded fixture, with the PR runtime measured first.
- First failure: scanner false positives on `references/` example code, the same failure SkillSpector hit (`skillspector-scan.yml:143-167`).
- Worst plausible case: contributors learn to override or ignore a noisy required check, and third-party code runs on every skill PR.
- Evidence limits: full-scanner noise and PR runtime are `unknown`.
- Cost to abandon: drop the required status and the job.
- Reversal target for A; adopting it requires separate approval.

**C. Full three tiers in CI.** Adds overlap detection and live lift, but needs a key, Docker, and spend, and duplicates the approved L3/lift lane. Proof: per-skill lift reports. Spend is `unknown`; measure first. Not recommended under this brief.

**Riskiest assumption (Feasibility):** full Tier 1 scanners produce actionable, low-noise findings on `skills/**`. **Cheapest test:** locally, keyless: run `skillevaluator doctor --tier 1`, then `validate skills --tiers 1 --continue-on-failure -r json`, then count HIGH/CRITICAL findings by check. Run it first in planning. Its result feeds the D2 proposal; it does not switch the option by itself.

## Evidence

| Claim | Status | Source |
| --- | --- | --- |
| SkillEvaluator is Apache-2.0, Python 3.12–3.14; Tier 1 needs no key; exit code is non-zero on failure or `INCOMPLETE` | confirmed(https://github.com/NVIDIA/SkillEvaluator README; https://docs.nvidia.com/skills/skillevaluator/tier1-reference) | web, 2026-11-18 |
| Policy overlay supports `severity_overrides` and does not waive the quality min-score; CI templates lack a custom-policy input | confirmed(tier1-reference docs) | web |
| Installed CLI version is 1.0.1 | confirmed(`uvx skillevaluator --version`) | local probe |
| 354 skills, `--checks schema,quality,unicode`: 351 pass, 3 fail; 0 critical / 3 high / 1,855 medium / 2,886 low | confirmed(probe `catalog-summary.json`) | local probe |
| The 3 HIGH findings are "missing top-level heading" in the 3 skills listed in AC3 | confirmed(probe output; no `^# ` line after frontmatter) | local |
| Quality scores: mean 87.65, min 77.5 (default pass 70); grades A=35, B=318, C=1 | confirmed(probe JSON) | local probe |
| Highest-volume findings are style rules hitting all 354 skills: missing `metadata.tags`/`author`, missing `## Instructions`/`## Examples`/`## Purpose`/troubleshooting, nesting depth | confirmed(probe JSON aggregation) | local probe |
| Smaller-volume findings: 42 `unknown_field` (`guardrail`), 26 isolated VS16 characters, multiple `description_trigger` placement findings, 50 broad descriptions without negative triggers | confirmed(probe JSON aggregation) | local probe |
| Harness-check: Claude Code and Codex shorten the listing when all 354 skills are installed (79,305 description chars vs about 8,000) | confirmed(`skillevaluator harness-check skills`) | local probe; consumer installs are subsets, so real exposure is `unknown` |
| Our validator already checks: name pattern and length; name equals directory; a trigger phrase anywhere in the description (warning); dead links; file size, warning above 7,168 bytes and failing above 8,192 bytes only when no `references/` exists; and description at or under 1,024 JS `length`, which counts UTF-16 code units | confirmed(`cli/src/services/validation/interopRules.ts:39-132`, `rules.ts:79-89`) | code read |
| Our injection scan detects zero-width and bidi characters, but body findings are warn-only unless `--strict` | confirmed(`cli/src/constants/security.ts:16-51`, `scripts/scan-injection.ts:139-144`) | code read |
| Probe reproduction: revision `11c8bd1a`, `uvx --python 3.13 skillevaluator` 1.0.1, `validate skills --type skill --tiers 1 --checks schema,quality,unicode --continue-on-failure -r json -o <dir>` and `harness-check skills`. Raw reports were not committed. | reported by intake probe; independently unverified until rerun | rerun in planning |
| Our guard has no H1-heading check and no trigger-position check | confirmed(`SkillValidator.ts:61-73` rule list; `rules.ts` and `interopRules.ts` grep) | code read |
| Invalid YAML fails `FrontmatterRule` (`Invalid YAML frontmatter`), so a duplicate key should fail. js-yaml duplicate-key rejection was not run here | confirmed path(`cli/src/services/validation/rules.ts:58-66`); behavior unknown | fixture in AC2 |
| SkillSpector scans only `SKILL.md`/`_INDEX.md` at a pinned commit and excludes 3 security skills; finding-level baseline is a documented follow-up | confirmed(`.github/workflows/skillspector-scan.yml:129-167`, `docs/SECURITY.md:216`) | code read |
| Full-scanner false-positive rate; CI runtime | unknown | measure first |

Research spike: Deep budget of 8 lookups; 6 used (README, Tier 1 docs, 4 local keyless probes). Stop rule met: Tier 1 contract, policy mechanics, and real catalog findings were found. Retrieved content was treated as data. No embedded directives were seen.

## Planner Check & Deep Sections

**Open decisions (owner: requesting maintainer):**

- **D1, scope of "weak spots":** (a) skill defects and guard coverage gaps *(default)*; (b) guard gaps only; (c) skill defects only.
- **D2, promotion criteria:** what moves the SkillEvaluator job from advisory to blocking (Option B)? (a) a separate approval after the full-scanner qualification probe, with HIGH/CRITICAL counts by check, `INCOMPLETE` status, and runtime evidence *(default)*; (b) never: it stays advisory; (c) block now on `schema` only. SkillSpector stays unchanged regardless; replacing it is a non-goal.
- **D3, trigger-position rule severity:** (a) warning, matching the existing `TriggerPhraseRule` (G4) *(default)*; (b) error. Harness listing budget stays advisory in either case, because consumers install subsets.

**Delegated builder decisions:** job name and placement; changed-skill detection (reuse `scripts/evals/changed-skills.ts`); report format (JSON artifact, optional SARIF); overlay file path; fixture location; exact H1 text for the 3 skills.

**Self-review:** no TBD/TODO. Every number traces to the probe, docs, or code. One plan scope (Option A); B is the explicit reversal target and C is recorded only. Two-reading check: "guard" and "weak spots" were resolved as assumptions and exposed in D1.

**Independent check:** two read-only rounds on the Personal · Analysis & Review profile, 2026-11-18. Both returned PASS-WITH-FIXES, and all fixes are applied:
- Coverage claims made precise. UTF-16 length and duplicate keys are already covered, so they now get fixtures instead of new rules. Unicode body findings are warn-only.
- AC2 aligned with the D3 default.
- Trigger window defined (first 60 characters).
- Promotion to blocking now requires approval.
- Full supply-chain locking and read-only permissions.
- Probe evidence relabelled as reproducible but independently unverified.
- Unsupported cadences removed.
- D2 re-scoped.
- Audit scoped to one version, with reviewed version bumps.
- Option cards completed with worst plausible case, evidence limits, and cost to abandon.

Skill provenance: the governing skills (`common-decision-discipline` and its references, `common-operator-profile`, `common-task-complexity-routing`) were read straight from `skills/common/**`, not through MCP. MCP `audit_session_compliance` therefore shows 0 loaded.

**Reviewers for implementation (tier=high):** `specialist-security-reviewer` (supply chain, CI permissions) and `specialist-architecture-guard`.

## Approval

approval: approved(requesting maintainer, 2026-11-18); scope: this brief and the Option A first plan; reopen: Contract / Options if D1–D3 change.
authority: planning handoff only; never implementation, spend, release, or runtime activation.

Post-approval note (operator question, 2026-11-18): adding a model key keeps the same files in scope but analyses them more deeply. It adds LLM rubric judging, LLM security analysis, `--llm-verify` false-positive triage, and Tier 2/3 runs. Every one of these stays a non-goal under this brief and needs separate spend approval.

## Outcome Report

```json
{"schema_version":1,"run_id":null,"slug":"skillevaluator-guard","workflow":"brainstorm-feature","feature_status":"requirements_ready","started_at":null,"completed_at":null,"requirement_trace":{"brd_objectives":["close guard gaps SkillEvaluator exposes","fix current defects","differential audit"],"requirements":[],"acceptance_criteria":["AC1","AC2","AC3","AC4","AC5","AC6"],"srs":[]},"completed_evidence":["README+Tier1 docs","keyless probe schema/quality/unicode on 354 skills","harness-check on catalog","SkillValidator rule inventory","independent check x2 PASS-WITH-FIXES applied","approval 2026-11-18"],"missing_evidence":["full Tier 1 scanner run","CI runtime","duplicate-key behavior of FrontmatterRule"],"decision_needed":[],"recommended_next_workflow":"plan-feature","cost":{"source":"unavailable"},"agent":{"identity":"unknown","model":"unknown"}}
```

## Next Workflow

`plan-feature` on the approved Option A scope.
