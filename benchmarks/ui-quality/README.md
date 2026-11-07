# UI Quality Benchmark Preparation

Six self-contained synthetic reference fixtures and one frozen experimental candidate. These fixture implementations are NOT generated experiment outputs and do not prove that guidance improves UI.

## Run Reference Fixtures

From repository root, serve only the fixture directory on loopback:

```sh
rtk proxy /opt/homebrew/bin/python3 -m http.server 4387 --bind 127.0.0.1 --directory benchmarks/ui-quality/fixtures
```

Open the named HTML file under `http://127.0.0.1:4387/`. No package install/build is required. B1–B4 are behavior/content reference implementations; do not leak their source into new-screen experimental generations. B5/B6 are the identical frozen existing-screen starters supplied to both arms. Stop the owned server after use. Python path is observed on the preparation workstation, not a portable runtime guarantee.

| ID | Fixture | Required task |
| --- | --- | --- |
| B1 | b1-fieldnote.html | Open Starter dialog, validate email, confirm and Escape/focus return |
| B2 | b2-relay-dispatch.html | North+Delayed, R-104 details, empty search/reset, error Retry |
| B3 | b3-harbor-workshops.html | Invalid fields, retained-value service failure, second-submit confirmation |
| B4 | b4-common-ground.html | Find safety/requirements, keyboard-expand FAQ, availability |
| B5 | b5-cedar-tasks.html | Space-toggle task, Completed filter, uncheck to empty with focus fallback |
| B6 | b6-nightjar-sessions.html | Reserve Static Bloom, two places, exact$36 demo confirmation |

B2 supports `?fixture=loading` and `?fixture=error`; transitions are deterministic1,000ms local fixtures. No network/backend/auth/payment proof.

## Freeze And Candidate

- `fixtures-freeze.json`: exact SHA-256 identities after corrections.
- `verification-report.md`: public verification report documenting Chromium smoke, WebKit/axe audits, unverified lanes, and screenshot evidence.
- `verification-status.json`: machine-readable summary of fixture verification and boundary limits.
- `candidate-addendum.txt`: literal candidate-only payload.
- `candidate-freeze.json`: addendum and baseline source identities; full future request payload is not yet constructed.
- `candidate-proposal.md`: incremental preflight artifact, isolation and falsification rules.
- Canonical design guidance was not changed. No external assets/code/data/prose imported.

## Observed Verification

See [`verification-report.md`](verification-report.md) for the complete verification report.

Chromium 156.0.8078.4 via installed playwright-cli 0.1.8: 25 desktop/mobile task/layout/retry checks, 5 focus/motion/heading checks, and 6 tablet document-bounds checks passed (36/36 total); no page JS errors observed. Desktop 1440×900, mobile 375×812, tablet 768×1024. Initial baseline failure (23 passed, 2 failed on B5 checkbox handling) was corrected and verified. Local runner configs, session caches, and raw captures in `.playwright-cli/` remain local untracked evidence and are excluded from the PR; durable public evidence is captured in `verification-report.md` and representative images in `evidence/`. `verification-status.json` records current proof boundaries. Initial favicon 404 was a static-server asset miss, not an application JS error.

Independent source reviewer `c387479c-421b-4164-ab6e-a76846bd51a2` closed four findings after corrections: B5 focus retention/fallback, B3 confirmation focus, B2/B3 reduced motion, and B6 h1. It did not independently run the browser checks.

Browser driver workaround: default macOS socket path failed EINVAL; using `TMPDIR=/tmp` with short named session `uiq` and explicit existing cached Chromium executable worked. Corrected pages were navigated with revision query parameters after one earlier navigation observed stale DOM. Initial errors and final outcomes remain separate; no fabricated before/after proof.

Operator-approved isolated tooling lives under `.playwright-cli/ui-quality-fixtures/tooling/`: Playwright 1.64.1, WebKit 27.2, and axe integration 4.14.0. WebKit loaded all 6 initial mobile states; axe reported 0 violations, with B2 color-contrast and B6 aria-prohibited-attr incomplete checks requiring manual review. B5 WebKit Space/focus and Completed→empty passed. These tooling and cache artifacts remain local-only and excluded from the PR. No product dependencies or global configuration changed. Actual screen-reader announcements, 200% zoom, full-state WebKit, and full contrast audit remain NOT RUN; no claims of full WCAG conformance or model efficacy.

## Experiment Gate

Full approved protocol: `docs/product/model-portable-ui-quality/evaluation-protocol.md`. Exactly3 pinned models across>=2 providers;72 outputs, at most2 repairs per slot; blinded independent paired review. These have not run. `experiment-readiness.json` names remaining account/model pinning, calibrated reviewer, tooling, bounded resource and authenticated authority gaps. No silent installs, purchases, premium use or weakening of protocol to manufacture completion. Current next action is resolve those gates, not claim quality results.

The operator subsequently selected **Pause experiment** and **Allow isolated tooling**. Tooling is provisioned; no experimental model generations are authorized or running. Preserve the frozen preparation; resume only on a new bounded execution decision.
