# Walkthrough: Evidence-led marketing local verification

## Scope and verdict

`verify-work` walkthrough of the delivered **local** evidence-led marketing slice and candidate PR readiness, updated 2026-10-26 from the accepted evidence paths below. It records requirements status, accepted and rejected outputs, and open gates. It is **not** an overall initiative PASS, release readiness, pilot authorization, or evidence of causal lift, ROI or human acceptance.

Evidence and claims below describe a historical checkpoint only. PR #263 description summarizes historical outcomes and embeds historical screenshots; detailed/raw receipts were removed and are not retained. Current CI and PR status must be read from current checks. No new test, build, browser, provider, or host action is claimed here. The standalone browser probe was a one-off fake-SDK/raw-command exercise, not a committed test.
Status legend: **PASS (local)** = exercised in the accepted local scope; **PARTIAL** = definition/rubric or narrowed slice accepted without the end-to-end behavior; **DEFERRED** = user chose not to do it; **NOT VERIFIED** = attempted or required evidence is missing.

## Requirement status

| REQ | Capability | Local status | Evidence and qualification |
| --- | --- | --- | --- |
| [`REQ-001`](../prd/prd-evidence-led-marketing.md) | Sourced positioning/proof | PARTIAL | T03 definition packages accepted by independent review; no live model efficacy or real audience study. |
| [`REQ-002`](../prd/prd-evidence-led-marketing.md) | Truthful landing/demo/community campaign | PASS (local) for assets and landing; publication not authorized | T09 accepted assets; T10 accepted local surface; drafts remain `prepared`. |
| [`REQ-003`](../prd/prd-evidence-led-marketing.md) | Measure outcomes, cost and decisions | PASS (local, synthetic) | T02 offline scorecard accepted (23/23 plus actual CLI smoke, executable `4d1269c8…6412b`); real cohort/consent/private storage not exercised. |
| [`REQ-004`](../prd/prd-evidence-led-marketing.md) | Evaluate, integrate and govern skills | PARTIAL | Local consumer integration PASS; independent evaluation NOT VERIFIED (2/246, comparability unverified). |
| [`REQ-005`](../prd/prd-evidence-led-marketing.md) | `marketing-audience-research` | PARTIAL | Definition and pressure cases accepted; two model answers are bundled, but pair comparability and efficacy remain unverified. |
| [`REQ-006`](../prd/prd-evidence-led-marketing.md) | `marketing-positioning` | PARTIAL | Definition accepted; no live behavior run. |
| [`REQ-007`](../prd/prd-evidence-led-marketing.md) | `marketing-proof` | PARTIAL | Definition accepted; NOT READY handling verified at rubric level only. |
| [`REQ-008`](../prd/prd-evidence-led-marketing.md) | `marketing-strategy` | PARTIAL | Definition accepted; no live behavior run. |
| [`REQ-009`](../prd/prd-evidence-led-marketing.md) | `marketing-content-strategy` | PARTIAL | Definition accepted; no live behavior run. |
| [`REQ-010`](../prd/prd-evidence-led-marketing.md) | `marketing-copywriting` | PARTIAL | Corrected scorer semantics accepted (qualified percentage passes; missing/unencoded/universal cases fail); no live model run. |
| [`REQ-011`](../prd/prd-evidence-led-marketing.md) | `marketing-landing` | PARTIAL | Landing protocol and pressure cases accepted; actual page recommendations are hypotheses, not conversion evidence. |
| [`REQ-012`](../prd/prd-evidence-led-marketing.md) | `marketing-search-discovery` | PARTIAL | Localhost `UNAVAILABLE` refusal verified; strict lexical alignment 78% (7/9) failure retained, not gamed. |
| [`REQ-013`](../prd/prd-evidence-led-marketing.md) | `marketing-community` | PARTIAL | Community protocol and guardrails accepted within the T05 landing/community/launch definition and rubric review; no publication. |
| [`REQ-014`](../prd/prd-evidence-led-marketing.md) | `marketing-launch` | PARTIAL | Definition accepted; launch remains not authorized. |
| [`REQ-017`](../prd/prd-evidence-led-marketing.md) | Bounded website signals | PARTIAL | GA4 consent-first contract; local application checks were reported at the fake-SDK/raw-command boundary. The one-off browser probe was not a committed test. Live collection remains blocked by owner decision; real Google SDK execution and provider receipt are unverified. |
| [`REQ-018`](../prd/prd-evidence-led-marketing.md) | Cohort consent and source handling | PARTIAL | Contract/offline privacy cases accepted; no real participant dataset, retention or withdrawal procedure exercised. |

## Acceptance criteria trace

| AC | Local status | Proof / evidence | Limit |
| --- | --- | --- | --- |
| [`AC-001`](../prd/prd-evidence-led-marketing.md) | PARTIAL | T03 proof/positioning rubric cases accepted | Definition/rubric, not model output quality |
| [`AC-002`](../prd/prd-evidence-led-marketing.md) | PARTIAL | T03 assumption-labelling cases accepted | Same |
| [`AC-003`](../prd/prd-evidence-led-marketing.md) | PASS (local) | T09 assets share `ctx-rev-20261025-capture-ee18d7f5`; manifest and transcript bound to candidate `a2228857` | Asset-level only |
| [`AC-004`](../prd/prd-evidence-led-marketing.md) | PASS (local) | Drafts remain `prepared`; no posting occurred | Not published |
| [`AC-005`](../prd/prd-evidence-led-marketing.md) | PASS (local) | T02 metric contract cases and accepted schema | Synthetic fixtures |
| [`AC-006`](../prd/prd-evidence-led-marketing.md) | PASS (local) | Missing baseline renders unknown with reason | Synthetic |
| [`AC-007`](../prd/prd-evidence-led-marketing.md) | PASS (local) | Immature activation excluded from mature denominator | Synthetic |
| [`AC-008`](../prd/prd-evidence-led-marketing.md) | PASS (local) | Confirmed repeat / no-return / unknown remain distinct | Synthetic |
| [`AC-009`](../prd/prd-evidence-led-marketing.md) | PASS (local) | Duplicate participant reports collapse or reject | Synthetic |
| [`AC-010`](../prd/prd-evidence-led-marketing.md) | PASS (local) | Zero repeat denominator returns unavailable with rationale | Synthetic |
| [`AC-011`](../prd/prd-evidence-led-marketing.md) | PASS (local) | Hours reported as capacity, not cash | Synthetic |
| [`AC-012`](../prd/prd-evidence-led-marketing.md) | PASS (local) | Attribution reported as descriptive | Synthetic |
| [`AC-013`](../prd/prd-evidence-led-marketing.md) | NOT VERIFIED | Exactly 2/246 attempts bundled; system-prompt digests differ (`eeac7618…` vs `94bfb0be…`) | Historical prompts not recovered; no efficacy delta |
| [`AC-014`](../prd/prd-evidence-led-marketing.md) | NOT VERIFIED | Static routing smoke: 6 negative file paths with 0 marketing matches; 3 qualified marketing keywords matched | No live trigger evaluation |
| [`AC-015`](../prd/prd-evidence-led-marketing.md) | PARTIAL | Guardrail pressure definitions accepted | Live model refusal unverified |
| [`AC-016`](../prd/prd-evidence-led-marketing.md) | PASS (historical candidate SHA; release tags open separately) | Remote consumer verification was reported for historical candidate `703f750b`; see PR #263 description. This is not evidence of current PR checks. | Candidate-specific only; formal version tags and release remain open. |
| [`AC-017`](../prd/prd-evidence-led-marketing.md) | PARTIAL | Independent definition/rubric acceptance for audience research capability | No verified model efficacy, real audience or deployed-origin checks |
| [`AC-018`](../prd/prd-evidence-led-marketing.md) | PARTIAL | Independent definition/rubric acceptance for positioning capability | No verified model efficacy, real audience or deployed-origin checks |
| [`AC-019`](../prd/prd-evidence-led-marketing.md) | PARTIAL | Independent definition/rubric acceptance for proof capability | No verified model efficacy, real audience or deployed-origin checks |
| [`AC-020`](../prd/prd-evidence-led-marketing.md) | PARTIAL | Independent definition/rubric acceptance for strategy capability | No verified model efficacy, real audience or deployed-origin checks |
| [`AC-021`](../prd/prd-evidence-led-marketing.md) | PARTIAL | Independent definition/rubric acceptance for content strategy capability | No verified model efficacy, real audience or deployed-origin checks |
| [`AC-022`](../prd/prd-evidence-led-marketing.md) | PARTIAL | Independent definition/rubric acceptance for copywriting capability | No verified model efficacy, real audience or deployed-origin checks |
| [`AC-023`](../prd/prd-evidence-led-marketing.md) | PASS (local, bounded) | Actual desktop/mobile surface observations ground the landing changes and stated limitations | Conversion baseline unknown; no measured loss or lift claimed |
| [`AC-024`](../prd/prd-evidence-led-marketing.md) | PARTIAL | Independent definition/rubric acceptance for search discovery capability | No verified model efficacy, real audience or deployed-origin checks |
| [`AC-025`](../prd/prd-evidence-led-marketing.md) | PARTIAL | Independent definition/rubric acceptance for community capability | No verified model efficacy, real audience or deployed-origin checks |
| [`AC-026`](../prd/prd-evidence-led-marketing.md) | PARTIAL | Independent definition/rubric acceptance for launch capability | No verified model efficacy, real audience or deployed-origin checks |
| [`AC-027`](../prd/prd-evidence-led-marketing.md) | PASS (local) | T09 accepted MP4; T10 parent actual Chromium playback, captions, clipboard, keyboard and trusted native fullscreen at 1280×800 and 390×844, with worker cases and independent source review covering transcript activation, no-JS links and disclosures | Portrait fullscreen only; terminal text small on mobile |
| [`AC-029`](../prd/prd-evidence-led-marketing.md) | PASS (historical local fake-SDK/raw-command boundary); provider receipt OPEN | GA4 consent-first contract and local application behavior were reported exercised at the fake-SDK/raw-command boundary. The one-off browser probe was not a committed test; PR #263 description summarizes the historical outcome and embeds historical screenshots. Detailed/raw receipts were removed and are not retained. | No real Google SDK execution, provider wire receipt, or live collection; collection remains blocked by owner decision. |
| [`AC-030`](../prd/prd-evidence-led-marketing.md) | PASS (historical local fake-SDK/raw-command boundary); provider receipt OPEN | Clipboard and consent behavior were reported exercised in local unit/E2E checks and the one-off probe. | No real provider receipt; probe is not a committed test. |
| [`AC-031`](../prd/prd-evidence-led-marketing.md) | PASS (historical local fake-SDK/raw-command boundary); provider receipt OPEN | Disabled/default-off path was reported exercised locally. | Bounded to exercised app paths; no real provider proof. |
| [`AC-032`](../prd/prd-evidence-led-marketing.md) | PASS (historical local fake-SDK/raw-command boundary); provider receipt OPEN | Application command parameters were reported checked without raw URL, query, or participant identity. | No wire-level provider proof; live collection remains blocked. |
| [`AC-033`](../prd/prd-evidence-led-marketing.md) | PASS (synthetic local exclusion only) | Synthetic absent/withdrawn participant records were excluded from the reporting dataset; no real participant data was imported. | Real participant import, storage, withdrawal, and erasure were not exercised; live collection remains blocked by owner decision. |

No AC is claimed as a whole-initiative pass. These are historical local claims, not current PR checks. T11 stopped at 2/246 attempts; 244 remained unlaunched, pair comparability was unverified, and no retries or replacements were made.

## Before vs after: rejected originals and accepted corrections

- **T09 media.** The original encoded video was rejected for fabricated captured output, unsupported host-enforcement display, wrong repeat window, unsourced research/policy/source identity and AC/G4 overclaims; it was never integrated. The corrected export was accepted after independent review and parent `ffprobe`/frame inspection: H.264 1920×1080 30 fps, video 56.000000s, AAC 56.021333s, mov_text 55.000000s, container 56.021354s, 884,035 bytes, digest `b129cb713dd681e6ad776d7ec35461454f165299e20a4227580712a12ea1c32f`.
- **T10 landing surface.** Historical local behavior and asset verification were reported in the PR #263 description. The standalone browser checks were one-off probes, not committed tests.
- **T11 pair.** Exactly 2 of 246 attempts were consumed; 244 remained unlaunched. Pair comparability was unverified because historical prompt arrays were not recovered. No retries or replacement evaluation were made; no causal or isolated efficacy delta is claimed.

## Execution evidence (checkpoint-qualified)

- T02: parent 23/23 focused tests and actual CLI expected synthetic ratios/digest/Markdown PASS.
- T03/T04/T05: independent definition acceptance; T04 actual scorer semantics accept qualified percentage and word-format outputs, and reject missing cargo/docker/non-UTF8 inputs, all six universal claims and a missing encoding caveat; T05 six pressure cases with assertions 4,2,3,3,3,3, six unsafe rejected and six safe accepted in reviewer rubric smoke.
- T06: parent 39 tests PASS on script `a271287b…` and SKILL `ca8f97c3…`; independent three-boundary inspection accepted.
- T07/consumer: five scenarios PASS — full standard assembly (12 marketing skills, evals excluded, storyboard/VTT/scorecard), flattened resource execution, omitted-category isolation, missing-PM `CAPABILITY_GAP`, workflow explicit/omitted/false variants.
- T10: worker typecheck 0 errors; `SITE_URL`-bound static build pass; focused 12/12; full suite first 69 pass/3 geometry failures, then 72/72 after the document-position invariant correction. Parent Chromium at both sizes: exact clipboard command, playback beyond 0.7s, seek 20s at readyState 4 / 1920×1080, seven cues observed with active 15.5–22s (count is a fixture observation, not a permanent test pin), Enter opens native disclosure, no horizontal overflow, no external requests, trusted native fullscreen reached `document.fullscreenElement === VIDEO`, Escape exercised.
- T12 bounded slice: independent source inspection of the final player, fixed media/tutorial resources, evaluation storage boundary and the two public answers/audits; no scanner/test/browser/provider rerun in that slice.
- Covering checkpoint: CLI 1,273 tests across 64 files PASS; MCP 209 tests PASS; separately executed root lanes (evals 85, freshness 62, outcome 23, trace 16, benchmark 8, metrics 44, release 8, harness 24, product-evidence 88) PASS; final canonical `validate:all` 345 passed/0 failed/71 warnings; affected workflow parity 43/43 after generated-wrapper repair.
- PR-preparation code checkpoint (post-settlement 2026-10-25): parent uninterrupted root test chain `rtk pnpm test` completed in 9.43s (exit 0; 1,693 test cases aggregate across CLI 1,273/64 files, evals 85, freshness 62, outcome 23, trace 16, benchmark 8, metrics 44, release 8, harness 24, product-evidence 88, marketing 62); parent `rtk pnpm mcp:test` passed 209/12 files; parent CLI Vite build and MCP tsup build passed with known Vite CJS/native-loader and duplicate pnpm key build warnings (not claimed strict TSC/format clean). This is a code checkpoint, not post-canonical-docs or remote CI.
- PR-preparation consumer & gate checkpoint (post-settlement 2026-10-25): parent re-exercised installed consumer smoke with workflow release `1.1.8`; all 5 scenarios PASS against updated frozen registry fixture snapshot `0cf6ec80db33b9e685aa84f18c9a18d3c96ab83cc5dbde625ed260c9490d2cbf` (1,412 files; historical accepted capture `ee18d7f5…` remains byte-unchanged; detailed record retained privately at `.agent/sdd/prd-plan-evidence-led-marketing/consumer-pr-preparation-record.json`). Parent gate validation confirmed: `pnpm validate:all` 345 passed / 0 failed / 71 warnings; `pnpm audit:sdlc` PASS; `pnpm audit:outcome` 21 templates and 6 run records PASS; `pnpm check-alignment` default 70% PASS (4 strict-90 warnings retained); `pnpm docs:capabilities:check` PASS.
- GA4 website unit: parent 40/40 tests PASS on Node 26 (initial 1 incidental region-name wording failure and 17 undefined identifier failures were corrected and recorded as history).
- GA4 website typecheck & lint: explicit project compiler PASS (`/opt/homebrew/bin/node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json` in `website/`); `rtk proxy pnpm lint:check` PASS (initial lint arguments failure resolved). (Root `rtk pnpm typecheck` surfaced 4 `Promise.withResolvers` lib errors including in unchanged E2E while explicit project compiler PASS — command environment distinction recorded, not verified root cause; zero config change).
- GA4 static export & E2E: Turbopack static export PASS with `SITE_URL` and telemetry disabled; production Chromium E2E passed 72/72 in 53.1s.
- GA4 application-boundary probe: a one-off standalone Playwright API probe was reported as 19 cases and 69 assertions at the `LOCAL_FAKE_SDK_RAW_COMMAND_BOUNDARY_ONLY` boundary. It was not a committed test and did not establish Google SDK execution, provider wire receipt, or live collection. PR #263 description summarizes the historical outcome and embeds historical screenshots; detailed/raw receipts were removed and are not retained.
## Retained failures and gaps (not rerun, not masked)

- The known preflight Vitest/undici Node 22 failure remains recorded: parent first focused Vitest command on default Node 22.14 failed before tests (`undici` 8.12.3 `undefined.bind`, 0 tests executed); parent rerun under Node 26 executed and passed all 38 unit tests (38/38 PASS).
- `check-alignment:strict` retains four below-threshold skills: `common-stitch-design` 87, `flutter-getx-navigation` 86, `marketing-search-discovery` 78 (7/9, lexical false negative under independent semantic review), `swift-best-practices` 83. No assertion was weakened.
- Canonical document IDs and graph connectivity are corrected: parent `pnpm audit:trace` passed after the recorded first-migration failure, with 3 objectives, 18 requirements, 34 acceptance criteria and 10 SRS cards. Graph coverage is not behavioral satisfaction. Formal product-evidence authority/bridge records and G3/G4 acceptance remain open.
- GA4 unit & lint history: an earlier parent unit checkpoint passed 38/39 tests and failed one incidental region-name wording assertion; that incidental test was removed rather than repinned. A subsequent run failed 17 undefined identifier checks which were corrected. Lint arguments failure was resolved. Root `rtk pnpm typecheck` surfaced 4 `Promise.withResolvers` lib errors in unchanged E2E files while explicit website project `tsc` passed without errors; recorded as a command environment distinction without changing tsconfig.
- At the earlier covering checkpoint, root lanes ran separately after a missing-wrapper failure that was corrected. The later PR-preparation checkpoint above completed one uninterrupted root test command; the historical checkpoint is not rewritten.

## Identity and output-path limits

- `ee18d7f5e57ac88d2621ba46316ce0e71262ef7ba686f04e0548e04fb60e5620` with 1,412 files is a **narrow registry fixture snapshot** used by the installed-consumer smoke, not the whole website candidate.
- Historical T10 and GA4 source identities were recorded at the candidate checkpoint; they do not identify current PR checks. PR #263 description summarizes historical outcomes and embeds historical screenshots; detailed/raw receipts were removed and are not retained.
- Candidate commit `703f750b` was used for historical remote consumer verification. This candidate result is separate from current PR checks and formal release tags.

## Cost

Exact host cost was unavailable at the historical checkpoint; no zero-cost assertion is made. PR #263 description summarizes historical outcomes and embeds historical screenshots; detailed/raw receipts were removed and are not retained.

## Open criteria (what this walkthrough does not establish)

- Full skill evaluation: 244 of 246 attempts unlaunched; pair comparability unverified; no skill-efficacy delta.
- Human UAT, independent human quality acceptance and any business-value review.
- Remote release tags (`marketing-v1.0.0`), deployment, published-origin proof, social preview and DNS/HTTPS gates.
- G3, G4, G5, G6, and whole-initiative T12/T13 completion (T13 runbook approved at `docs/product/evidence-led-marketing/pilot-handoff.md`; pilot execution open).
- Real consent storage/retention/withdrawal, real cohort observations, baseline, ROI, spend and causal lift.
- Arbitrary collector absence beyond inspected code and exercised actions is not established. Historical local GA4 checks were limited to the fake-SDK/raw-command boundary; the one-off browser probe was not a committed test. Real Google SDK execution, provider wire receipt, and live collection remain unverified and blocked by owner decision.

## Next authorized workflow

Next workflow: use current PR checks for current status. Any further T11 evaluation requires separate authorization and a supported host operator entry point. Publication, deployment, pilot activation, spend, and evaluator continuation remain separately gated.
