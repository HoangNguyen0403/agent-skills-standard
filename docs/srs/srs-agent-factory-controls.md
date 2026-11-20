# Technical Design (SRS/FRS): Agent Factory Controls — S4 merge gate, S5 metrics and bands

## Decision Brief

- Changes since approved revision: first revision; covers PRD slices S4 and S5 only (S0-S3 need no separate design).
- Recommendation: one `pr-gate` CI job driven by a tested TypeScript script that reads only the `pull_request` event payload and local git; it runs `review_gate.py classify` but not `review_gate.py check`. A read-only GitHub exporter maps PRs and tag-triggered workflow runs to `delivery-observations.json`, leaving kinds GitHub cannot observe as uncovered.
- Impact if wrong: gate either blocks legitimate generated-export churn (false positive) or passes PRs without review evidence (false negative); exporter could report fabricated review effort.
- Evidence and limitations: `confirmed(skills/common/common-review-policy/scripts/review_gate.py:975-1010)` `check` requires `--dispatch-receipt` and untracked run artifacts (`skills/common/common-subagent-driven-development/references/delivery-report.md:49,55`), so it cannot run on a committed CI checkout; `classify --base --head --json` can. `confirmed(skills/common/common-sdlc-metrics/references/metrics-schema.md:55-106)` event kinds and fail-closed validation. `confirmed(scripts/metrics/bands.ts:61-62)` band sources are `<file>.json (<field> field)` series. `confirmed(.gitignore:17)` `/artifacts/` is ignored. Deploy triggers: `publish.yml` on `cli-v*`/`mcp-v*`/skill tags, `deploy-server.yml` on `server-v*`, `deploy-website.yml` on `website-v*` + manual dispatch.
- Resolved decision: dependabot `[bot]` PRs skip body checks (SRS-AFC-03); owner-approved 2026-11-18.
- Approval: owner approved this design on 2026-11-18. D3: `PR_GATE_MAX_AUTHORED_LINES=1000`, report mode first. Enforce switch and ruleset edit remain owner actions.
- Independently ready slices: S4 and S5 (S0 generated-glob constant `GENERATED_PATH_GLOBS` exists in `scripts/metrics/pr-baseline.ts`).

## Trace Source

- PRD: `docs/prd/prd-agent-factory-controls.md` revision 1 (D1-D4 accepted 2026-11-18).
- Source IDs: REQ-AFC-05..08; AC-AFC-09..14.

## Architecture And Contract Delta

- New: `scripts/pr-gate/pr-gate.ts` (+ test), job `pr-gate` in `.github/workflows/ci.yml`, `scripts/metrics/github-export.ts` (+ test), `docs/ops/bands.yaml`.
- Reused, unchanged: `review_gate.py classify`, generated-glob constant exported by S0 `scripts/metrics/pr-baseline.ts`, `scripts/metrics/delivery.ts` validator, `scripts/metrics/bands.ts` reader.
- Changed: PR templates (`.github/pull_request_template.md`, `skills/common/common-git-collaboration/references/pr-template.md`) gain two placeholder lines under `## Evidence` (S4 owns this edit after S1 lands).
- Ownership: CI owner = S4 worker; metrics owner = S5 worker; orchestrator integrates generated mirrors.

## Technical Requirements

### SRS-AFC-01: pr-gate inputs and isolation

- Statement: workflow `.github/workflows/pr-gate.yml`, job `pr-gate` (`name: pr-gate`, required-check context), triggers on `pull_request` types `opened, synchronize, reopened, edited, labeled, unlabeled` so body and label changes re-evaluate the gate without re-running all of CI; `permissions: contents: read`; reads PR body, labels and author from `$GITHUB_EVENT_PATH`; never interpolates `${{ github.event.pull_request.* }}` into `run:` (env/file only); writes no comments; uses no secrets. Must.
- Source: AC-AFC-11.
- Behavior / failure: checkout with `fetch-depth: 0`; base = `git merge-base pull_request.base.sha pull_request.head.sha`, head = `pull_request.head.sha` (the PR base SHA itself is not an ancestor once the target branch advances). Missing event file, SHAs or merge base => exit 2 (job fails in both modes; infrastructure error is never a pass).
- NFR / security impact: fork PRs get a read-only token; untrusted body text is parsed, never executed or echoed unescaped into workflow commands (escape `%`, `\r`, `\n` per Actions command rules). Paths rendered in the step summary are HTML-escaped inside `<code>` with control characters and backticks encoded.
- Verification: unit tests with fixture event payloads (incl. injection strings) — `rtk pnpm test:pr-gate` (`node --import tsx --test scripts/pr-gate/*.test.ts`); workflow review.

### SRS-AFC-02: authored-size budget

- Statement: authored lines = sum of additions+deletions from `git diff --numstat -z -M <merge-base> <head>` over destination paths NOT matching the S0 generated-glob constant (imported, never duplicated). Unchanged moves count 0; edited moves count their changed lines, classified by destination path. Breach when authored lines > `PR_GATE_MAX_AUTHORED_LINES` (D3) and no `size-exception` label. Must.
- Source: AC-AFC-09.
- Behavior / failure: binary files (`-` numstat) count 0 and are listed. Label present => reported as "exception claimed", never a breach; the reason is the PR body text under `## Blast radius` (not validated).
- Verification: unit tests: generated-only PR => 0 authored; mixed PR; label exemption; binary file; unchanged/edited/boundary moves; real-git divergent base/head integration test.

### SRS-AFC-03: review-evidence declaration check

- Statement: PR body must contain non-empty `## Requirements` (S1), and under `## Evidence` the lines `Independent review: <reviewer/profile + verdict>` and `Gate check: <review_gate.py check output line or "not run: <reason>">`, and non-empty `## Not verified`. HTML-comment-only, `<...>`-only and punctuation-only values are empty. Each missing/empty item is one finding. Must.
- Source: AC-AFC-10; D1.
- Behavior / failure: author with `login == "dependabot[bot]"` and `type == "Bot"` skips body checks (size still reported) — owner-approved. A `Gate check: not run` is reported, not a breach. Declarations are not authenticated (same limit as agent-review-trust).
- Verification: unit tests per missing field, the shipped template with only Independent review filled, dependabot skip and login-spoof (type User) case.

### SRS-AFC-04: trunk-path attention list

- Statement: run `python3 skills/common/common-review-policy/scripts/review_gate.py classify --policy docs/review-policy.md --base <merge-base> --head <head> --json`; list every `trunk` path in the job summary as "line review required". Informational in both modes. Must.
- Source: AC-AFC-10.
- Behavior / failure: classify exit 2 (malformed policy) => job fails in both modes.
- Verification: unit test with stubbed classify output; one real run on a test PR touching `.github/workflows/ci.yml` shows it as trunk (same classification the agent-review-trust consumer smoke asserts).

### SRS-AFC-05: report vs enforce

- Statement: mode from workflow env `PR_GATE_MODE` (`report` default). Report: findings as `::warning` + `$GITHUB_STEP_SUMMARY`, exit 0. Enforce: findings as `::error`, exit 1. Switching to enforce is a one-line owner edit to `pr-gate.yml` (trunk) recorded in `docs/review-policy.md` tuning log. Must.
- Source: AC-AFC-09, AC-AFC-10, D3.
- Verification: unit tests for both modes; one real PR run in report mode.

### SRS-AFC-06: owner ruleset step (documentation only)

- Statement: S4 adds a runbook block to `docs/review-policy.md` "Tuning and Feedback" with the exact `gh api --method PUT repos/HoangNguyen0403/agent-skills-standard/rulesets/<id>` payload adding `required_status_checks` for `secret-scan`, `lint-and-format`, `unit-tests`, `validate-skills`, `pr-gate` (D2), preserving all existing rules and bypass actors. Agents never execute it. Must.
- Source: AC-AFC-12.
- Verification: owner runs it; `gh api .../rulesets/<id> | jq '.rules[].type'` includes `required_status_checks`. Check-context names are confirmed from a real PR's check list before the owner applies it.

### SRS-AFC-07: GitHub delivery exporter

- Statement: `rtk pnpm metrics:github-export --since <date> [--until <date>]` writes `artifacts/metrics/delivery-observations.json` (`schema_version: 1`, `source_kind: "host-export"`) via `gh` read-only calls through an injectable fetcher. Should.
- Source: AC-AFC-13.
- Mapping (change_id = `pr-<number>`, revision = merge-time head SHA):
  - `submission`: attempt 1 at PR `createdAt`.
  - `correction`: one `round_id` per `CHANGES_REQUESTED` review followed by ≥1 commit before merge.
  - `acceptance`: merged => `accepted` at `mergedAt`, `authority_ref: "merge:<merge_commit_sha>"`; closed unmerged => `rejected` at `closedAt`.
  - `deployment`: each successful run of `publish.yml` / `deploy-server.yml` / `deploy-website.yml` (production target only) on a tag => `deployment_id: "gha:<workflow>:<run_id>"`, `environment: "production"`, `deployed_at` = run completion, `first_change_at` = earliest `createdAt` of PRs merged into the tagged commit since the previous successful run of the same workflow; PRs map to deployments by `git merge-base --is-ancestor`.
  - Not exported (no GitHub source): `review` (no active time), `decision-wait`, `defect`, `cost`. Coverage `kinds` lists only exported kinds, so those metrics stay `unavailable`.
- Behavior / failure: output passes `scripts/metrics/delivery.ts` validation or the exporter exits non-zero without writing. No PR bodies, titles, comments, or reviewer identities stored.
- Verification: `rtk pnpm test:metrics` with fixtures; one real run followed by `rtk pnpm metrics:report --json` showing accepted-change rows (review effort `unavailable`).

### SRS-AFC-08: control bands

- Statement: `docs/ops/bands.yaml` from `references/bands-template.yaml` with bands whose `source` resolves through `bands.ts`: (a) authored PR lines series from S0 baseline JSON; (b) one CI or benchmark series already readable by `bands.ts` (e.g. benchmark gate metric). Each band: owner `maintainer`, `rolling_30d` baseline, tiers log / read-only diagnose / propose (routes `pull_request` only), `harm_check` naming a consumer-visible failure (failed publish, broken `ags sync`). Could.
- Source: AC-AFC-14.
- Behavior / failure: a source `bands.ts` cannot resolve is reported `unavailable`, never dropped.
- Verification: `rtk pnpm metrics:report --json` lists each band as evaluated or `unavailable` with reason; `rtk pnpm test:metrics`.

### SRS-AFC-09: Slices S0-S3 need no additional design

- Statement: S0 baseline script, S1 PR requirement trace, S2 ADR log and S3 policy wording are implemented directly from their PRD acceptance criteria; no new interface or storage contract beyond the generated-glob constant S0 exports for S4. Must.
- Source: AC-AFC-01, AC-AFC-02, AC-AFC-03, AC-AFC-04, AC-AFC-05, AC-AFC-06, AC-AFC-07, AC-AFC-08.
- Behavior / failure: as stated per AC in the PRD.
- Verification: per-AC lane in the PRD.

## Extensions

| Trigger | Required extension |
| --- | --- |
| Sensitive change (CI trunk control) | Human gate: owner flips `PR_GATE_MODE` and edits ruleset; `specialist-security-reviewer` lens on S4 diff (injection, token scope) |
| Storage contract (observations file) | Uses existing schema; no new fields |

## Blockers And References

- blocked(S4 enforce, maintainer, owner decision after 2-week report window)
- blocked(S4 template lines, integration owner, S1 merged first)

## Status And Receipt

- `feature_status`: `design_ready` pending owner design approval.
- Run record: none written.

## Next Workflow

- `implementation-readiness` for S4 and S5 after S0 lands.
