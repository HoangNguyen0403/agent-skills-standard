# Feature Plan: Agent Factory Controls

slug: agent-factory-controls
revision: 1
operator_profile: technical
lane: direction
delivery_mode: extended (touches trunk controls: `.github/workflows/`, `docs/review-policy.md`, repository ruleset)
snc_tier: high (S=2 N=1 C=2; inference: CI gate, review policy and shared workflow conventions reach every consumer)
model_tier: standard for M1 slices; strong for M2 gate design (capability hint only; host profiles resolve at dispatch)
approval: maintainer accepted D1 (keep bypass + evidence), D2 (core checks), D3 (1,000 authored lines, report mode first), D4 (shipped ADR convention) and Subagent-Driven execution on 2026-11-18; no ruleset, branch-protection, publication or release authority
owner: requesting maintainer (@HoangNguyen0403)
repository_status: implemented (1b76521959 M1, 958049b179 S4, c3b9a49977 S5; branch spiffy-quail)
activation_status: not_assessed

## Decision Brief

- **Changes:** first revision. Source: session request "create the plan to improve all" after the AI-software-factory / cloud-agent / SDD gap analysis.
- **Recommendation:** close the gap between the declared review process and the observed merge practice before adding agent throughput. Three independently revertible milestones: M1 traceability and decision memory (consumer-facing, low risk); M2 merge gate in report mode, activated only by the owner; M3 measurement and control bands that later feed review-trust calibration.
- **Impact if wrong:** more parallel agents push more 2k+ line PRs through a bypass path with no recorded review evidence; escaped defects reach published CLI/MCP/website consumers.
- **Evidence and limitations:** see Evidence. S0 baseline (100 merged PRs; additions + deletions; generated mirrors excluded): authored median 1,386 / p75 3,910 / p90 12,627 lines; created→merged median 9.6 h; 88/100 with no recorded GitHub review; 32/100 merged within 2 hours. `reviewCount` counts review events, not approvals. Bypass actor role is inferred.
- **Resolved decisions:** D1-D4 accepted by the maintainer (session 2026-11-18).
- **Approval sought:** none open for S4/S5 — owner approved `docs/srs/srs-agent-factory-controls.md` (incl. dependabot body-check skip) on 2026-11-18. Enforce mode and the ruleset edit remain owner actions. No approval here grants report-only/hunk-review or authorizes publication.
- **Independently ready slices:** all slices implemented and independently approved; remaining steps are owner actions (see Next Workflow).
## Outcome And Guardrails

Outcome: every merged change to `develop` carries a requirement link, independent review evidence and passing required checks; architectural decisions are durable and read before planning; delivery and review effort are measurable per accepted change.

Guardrails that must not regress:

- Human merge approval authority stays with the maintainer; no agent approves or merges its own change.
- `docs/review-policy.md` default stays line-review; report-only stays disabled (agent-review-trust DD-3). This plan grants no review level.
- CodeQL and code-quality ruleset rules stay required.
- Workflow files stay within `scripts/audit-sdlc.ts` line caps; `SKILL.md` ≤100 lines; detail goes to references.
- No new document burden for `brief` delivery mode beyond the PR requirement line.
- Missing metrics data is `unavailable`, never zero.

## Scope And Non-Goals

Scope fence: this repository's PR template, canonical skills/workflow references for PR template and ADRs, `docs/`, `scripts/metrics/`, `.github/workflows/ci.yml` (new job only), and generated exports of edited canonical files. Ruleset edits are owner-executed steps documented here, not agent actions.

| Capability | Gap | Disposition | Slice |
| --- | --- | --- | --- |
| Baseline of PR size (generated vs authored), review and merge latency | G0 | In scope | S0 |
| Requirement trace line in PRs, checked by reviewer | G6 | In scope | S1 |
| Durable decision log (ADR index) read before planning | G3 | In scope | S2 |
| Policy/anti-pattern contradiction resolved | G2 | In scope | S3 |
| CI merge gate: size budget + Delivery Report check, report mode | G1 | In scope | S4 |
| Required status checks on `develop`/`main` | G1 | Owner action after S4 (D2) | S4 |
| Delivery observations export + monthly metrics report | G7 | In scope | S5 |
| `docs/ops/bands.yaml` for publish, server deploy, website deploy | G5 | In scope | S5 |
| Review-trust calibration toward a hunk-review grant | G1 | Deferred until ≥30 observed accepted changes; owner decision | - |
| Additional SAST (Semgrep etc.) | G4 | Excluded: CodeQL default setup is configured and ruleset-required | - |
| Second human code owner | - | Excluded: solo maintainer; independent agent review is the compensating control | - |
| Feature flags / runtime exposure control | - | Excluded: no runtime product surface in this repo; consumer guidance already in `deploy-release` | - |
| Auto-merge, report-only, hunk-review grants | - | Excluded (DD-3) | - |

## Requirements And Acceptance Criteria

No BRD objective IDs exist; every requirement traces to the session request.

| Requirement | Behavior | Owner | Priority | Status |
| --- | --- | --- | --- | --- |
| REQ-AFC-01 | A reproducible baseline separates authored from generated changed lines and reports review count and merge latency per merged PR | Maintainer | P0 | Proposed |
| REQ-AFC-02 | Every PR names the requirement/AC IDs or approved ticket it satisfies, and the PR reviewer flags a missing link | Maintainer | P0 | Proposed |
| REQ-AFC-03 | Architecture and public-contract decisions are recorded in an indexed ADR log that planning and design read first | Maintainer | P1 | Proposed |
| REQ-AFC-04 | SDLC guidance and review policy state one consistent review rule | Maintainer | P1 | Proposed |
| REQ-AFC-05 | A CI job reports authored-size budget breaches and missing/invalid Delivery Report receipts on every PR | Maintainer | P0 | Proposed |
| REQ-AFC-06 | Merges to protected branches require the agreed CI checks; bypass merges carry recorded review evidence | Maintainer | P0 | Proposed (D1, D2) |
| REQ-AFC-07 | A local export produces `artifacts/metrics/delivery-observations.json` from GitHub data so `metrics:report` yields accepted-change measures | Maintainer | P1 | Proposed |
| REQ-AFC-08 | Control bands exist for this repo's release surfaces and are machine-readable by `scripts/metrics/bands.ts` | Maintainer | P2 | Proposed |

| AC | Requirement | Given / when | Observable result | Owner | Single verification lane |
| --- | --- | --- | --- | --- | --- |
| AC-AFC-01 | REQ-AFC-01 | Baseline script runs over a date window | JSON lists per PR: authored lines, generated lines, review count, created→merged hours; totals and medians; generated-path globs declared in one place | Script owner | Unit tests on fixture PR data |
| AC-AFC-02 | REQ-AFC-01 | GitHub API is unreachable or a PR lacks file data | That PR is `unavailable`, not zero; exit non-zero only on malformed input | Script owner | Unit tests |
| AC-AFC-03 | REQ-AFC-02 | A PR is opened from the template | Template has a `## Requirements` section before `## Evidence` accepting REQ/AC IDs or an approved ticket reference | Skill owner | Template diff review |
| AC-AFC-04 | REQ-AFC-02 | `specialist-pr-reviewer` reviews PR metadata without a requirement link | It reports a Major "missing requirement trace" finding | Skill owner | Specialist eval case (structural; live run NOT RUN unless authorized) |
| AC-AFC-05 | REQ-AFC-03 | `design-solution` changes architecture or a public contract | It writes `docs/adr/NNNN-<slug>.md` from the template and appends one index line to `docs/adr/README.md` | Skill owner | `audit:sdlc` + workflow contract review |
| AC-AFC-06 | REQ-AFC-03 | `plan-feature` or `design-solution` starts | Load-context step names `docs/adr/README.md` as input when present; absent log is not a blocker | Workflow owner | `audit:sdlc` |
| AC-AFC-07 | REQ-AFC-03 | Log is seeded | Index holds ≥3 backfilled ADRs for already-accepted decisions (delivery_mode sizing; review-trust DD-3; generated-export mirrors), each linking its source PRD/PR | Maintainer | Doc review |
| AC-AFC-08 | REQ-AFC-04 | Reader compares quick reference anti-patterns with review policy | Anti-pattern states the target (human attention on intent/risk/gates) and that line-review remains the default until an owner grant under review-policy | Doc owner | Doc review |
| AC-AFC-09 | REQ-AFC-05 | A PR exceeds the authored-line budget (D3) without a `size-exception` label + reason | `pr-gate` job reports the breach; in report mode it passes with a summary annotation; in enforce mode it fails | CI owner | Workflow run on a test PR |
| AC-AFC-10 | REQ-AFC-05 | PR body lacks a filled `## Requirements`, `Independent review:` (reviewer + verdict) or `Gate check:` (local `review_gate.py check` result line, or "not run: <reason>") line under `## Evidence`, or a filled `## Not verified`; or `review_gate.py classify` (from the merge base) finds trunk paths | `pr-gate` reports each missing field and lists trunk paths requiring line review; same report/enforce semantics. `review_gate.py check` itself stays a local pre-handoff step: it requires untracked run artifacts and an external dispatch receipt, so CI cannot re-run it | CI owner | Workflow run on a test PR |
| AC-AFC-11 | REQ-AFC-05 | `pr-gate` runs on a fork PR | It reads no secrets and writes no PR comments (`pull_request` event, read-only token) | CI owner | Workflow review + run |
| AC-AFC-12 | REQ-AFC-06 | Owner applies the documented ruleset change (D2) | `gh api .../rulesets/<id>` shows `required_status_checks` with the agreed contexts | Maintainer | Owner-run command output |
| AC-AFC-13 | REQ-AFC-07 | Exporter runs with an authenticated `gh` | Writes `artifacts/metrics/delivery-observations.json` (git-ignored) that `rtk pnpm metrics:report --json` accepts; review effort is `unavailable` unless explicitly recorded | Script owner | `rtk pnpm test:metrics` + one local run |
| AC-AFC-14 | REQ-AFC-08 | `docs/ops/bands.yaml` exists | It validates against `bands.ts`; each band has owner, source, baseline window, tiers; no tier exceeds read-only diagnose/propose | Ops owner | `rtk pnpm metrics:check` (or bands unit test) |

## Recorded Consequential Decisions

| Decision | Recommended default | Owner | Affected slice | Required input |
| --- | --- | --- | --- | --- |
| D1 (accepted): bypass policy | Keep maintainer bypass (solo maintainer cannot self-approve on GitHub) but require `pr-gate` green and an independent-review Delivery Report in the PR body for every bypass merge | Maintainer | S4 | Resolved 2026-11-18 |
| D2 (accepted): required checks | `secret-scan`, `lint-and-format`, `unit-tests`, `validate-skills`, `pr-gate`; OS matrix and native-ingress stay advisory until flake rate known | Maintainer | S4 | Resolved 2026-11-18; owner applies ruleset |
| D3 (accepted): size budget | Warn above 1,000 authored lines (S0 baseline 2026-11-18, additions + deletions: median 1,386, p75 3,910, p90 12,627 over 100 merged PRs); `size-exception` label with reason to exceed; report mode for 2 weeks before an owner enforce decision | Maintainer | S4 | Resolved 2026-11-18; re-confirmed against the corrected baseline |
| D4 (accepted): ADR scope | Ship as a standard convention (skill reference + `design-solution`), and dogfood here | Maintainer | S2 | Resolved 2026-11-18 |

## Delivery Plan

Sizes are comparative, not dates. Each slice has one implementation owner and a disjoint write set; generated exports are regenerated only by the integration owner after canonical edits.

| Slice | Type | Delivers | Owned paths | Depends on | Size | Rollback |
| --- | --- | --- | --- | --- | --- | --- |
| S0 Baseline | research | AC-AFC-01, AC-AFC-02 | `scripts/metrics/pr-baseline.ts` + test, `artifacts/agent-factory-controls/baseline.json` | - | S | Delete script |
| S1 Requirement trace | feature | AC-AFC-03, AC-AFC-04 | `.github/pull_request_template.md`, `skills/common/common-git-collaboration/references/pr-template.md`, `skills/specialists/specialist-pr-reviewer/` (+ eval case) | - | S | Revert PR |
| S2 Decision log | feature | AC-AFC-05, AC-AFC-06, AC-AFC-07 | `docs/adr/`, design-solution skill reference for ADR template/location, `.agents/workflows/design-solution.md` and `plan-feature.md` (in-place, within caps) | D4 | M | Revert PR; existing ADR files stay readable |
| S3 Policy consistency | mechanical | AC-AFC-08 | `docs/sdlc-workflow-quick-reference.md` | - | XS | Revert PR |
| S4 Merge gate | feature | AC-AFC-09, AC-AFC-10, AC-AFC-11, AC-AFC-12 | `.github/workflows/pr-gate.yml` (new workflow, job `pr-gate`), `scripts/pr-gate/pr-gate.ts` + test, owner runbook section in `docs/review-policy.md` tuning log | S0, D1-D3 | M | Delete the workflow; owner removes required check |
| S5 Metrics + bands | feature | AC-AFC-13, AC-AFC-14 | `scripts/metrics/github-export.ts` + test, `docs/ops/bands.yaml`, `.gitignore` entry | S0 | M | Delete exporter/bands file |
| Integration | prerequisite | export regeneration, CHANGELOG, `ARCHITECTURE.md` notes | generated mirrors, `CHANGELOG.md` | S1-S5 | S | Revert integration commit |

Milestones:

- **M1 (S0, S1, S2, S3):** consumer-visible conventions; no trunk-control change. Independent review per slice.
- **M2 (S4):** trunk; `specialist-architecture-guard` + `specialist-security-reviewer` lenses. Ships in report mode; owner flips to enforce and edits the ruleset (AC-AFC-12). Agents never edit rulesets.
- **M3 (S5):** measurement. After ≥30 accepted changes with observations, open a separate decision on a hunk-review grant for one leaf `shared` class under review-policy; not part of this plan.

Verification per slice: `rtk pnpm lint:check`, `rtk pnpm audit:sdlc`, `rtk pnpm test:metrics` (S0, S5), `rtk pnpm --filter ./cli validate` after export regeneration, and the slice's AC lane. Eval-lane ACs stay NOT RUN without separate live-eval authorization (agent-review-trust D3).

## Evidence

- `confirmed(docs/review-policy.md:78-86)`: approval row is line-review for all classes; report-only disabled; hunk-review not activated.
- `confirmed(docs/sdlc-workflow-quick-reference.md:278)`: anti-pattern "No line-by-line human review of agent-written diffs" conflicts with the policy default.
- `confirmed(gh api repos/HoangNguyen0403/agent-skills-standard/rulesets, 2026-11-18)`: ruleset `maintainer` requires 1 approval + code-owner review, CodeQL (high+), code quality, Copilot review on push; no `required_status_checks` rule; RepositoryRole actor 2 bypass `always` (role mapping inferred).
- `confirmed(gh api .../code-scanning/default-setup)`: CodeQL default setup configured for actions, JS/TS, Python, weekly.
- `confirmed(gh pr list --state merged --limit 40, 2026-11-18)`: 37/40 have no recorded GitHub review; median 2,139 changed lines (generated mirrors not separated); 28/40 exceed 1,000 lines; 19/40 merged within 2 hours.
- `confirmed(.github/CODEOWNERS)`: `* @HoangNguyen0403` single owner.
- `confirmed(.github/pull_request_template.md:16-30)`: Evidence, Blast radius, Rollback, Not verified present; no requirement-trace section.
- `confirmed(.agents/workflows/design-solution.md:25-26)`: ADR required on architecture/contract change; no location or index defined. No `docs/adr/` exists.
- `confirmed(skills/common/common-sdlc-metrics/SKILL.md)`, `scripts/metrics/delivery.ts`: report consumes `artifacts/metrics/delivery-observations.json`; file absent; no exporter found in `scripts/metrics/`.
- `confirmed(skills/common/common-sdlc-metrics/references/bands-template.yaml)`; `docs/ops/bands.yaml` absent.
- `confirmed(git show 5387d3b95)`: agent-review-trust (#334) merged; `skills/common/common-review-policy/scripts/review_gate.py` exists and is reused by S4.

## Risks

| Risk | Owner | Disposition |
| --- | --- | --- |
| Size budget punishes legitimate generated-export churn | CI owner | S0 declares generated globs once; budget counts authored lines only |
| Report-mode gate is ignored | Maintainer | Fixed 2-week report window, then D3 enforce decision recorded in review-policy tuning log |
| Delivery Report check treated as authenticated proof | Integration owner | Same limit as agent-review-trust: declarations, not actor authentication; human approval unchanged |
| Exporter leaks private data into committed files | Script owner | Output path git-ignored; counts and IDs only; no PR bodies or comments stored |
| Workflow edits exceed audited caps | Implementation owner | In-place replacement; detail in skill references |

## Status And Receipt

- `feature_status`: implemented; every slice independently reviewed to APPROVE. Not verified: live GitHub `pr-gate` run, ruleset application, live specialist evals, GitHub-rendered summary. Observed DORA rows stay unavailable because exported deployment coverage does not span the report period (fail-closed by design).
- Run record: none written.

## Next Workflow

- Owner: regenerate mirrors and `skills/metadata.json` in the main checkout (`pnpm generate-indices`; fixes pre-existing #308 drift); commits here skipped the generator pre-commit hook by owner instruction.
- Owner: open a PR, confirm check contexts with `gh pr checks`, apply the ruleset runbook in `docs/review-policy.md`.
- Owner: after the 2-week report window, decide `PR_GATE_MODE=enforce` and record it in the review-policy tuning log.
- Later decision (M3 follow-on): hunk-review grant for one leaf `shared` class once ≥30 accepted changes carry observations.
