# Task 10 Delivery Report: Additive Landing Page Integration (Corrective Batch 2)

**Initiative**: `evidence-led-marketing` | **Task**: `T10 Landing page integration`
**Date**: 2026-10-25 | **Owner**: T10 landing owner (single bounded owner for this corrective)
**Status**: `CORRECTED LOCAL SURFACE — AWAITING INDEPENDENT REVIEW / PARENT AUDIT`
**Gate G4**: `NOT CLAIMED` (no self-pass; AC-16 remote release gate remains open)

---

## 1. Scope of this corrective batch

Independent review findings addressed in one batch, without changing architecture, dependencies,
generators, media assets, analytics, or deployment state:

1. Removed fabricated execution runtimes (`0.085s–0.700s`, `~0.1–0.7s`) from the visible demo copy.
   The surface now states only what is known: an edited 56s presentation of captured local candidate
   command output, with candidate `a2228857`, tree `ee18d7f5`, context
   `ctx-rev-20261025-capture-ee18d7f5`, and the open AC-16 remote release gate.
2. Removed the incomplete `node .../report-marketing.mjs --format markdown` command from the scorecard
   scene summary. That invocation omits required input/root/as-of arguments, so it was not published.
   The scene is labelled as a summary and keeps only the captured-output description.
3. Relabelled the transcript surface. The linked asset is the accepted video transcript containing
   sanitized captured-output excerpts and caption timings, not a raw/unedited command log. Visible
   labels are now `Full video transcript (Markdown)` and `Captured video excerpts and captions (WebVTT)`;
   the caveat note states that the complete sanitized capture is the separate campaign artifact
   `command-capture.log`. Prominent server-rendered links remain outside the `<video>` element.
4. Replaced incidental test pins with behavioral assertions:
   - caption test no longer asserts a cue count (7) or a sentence fragment; it derives cue intervals
     from the loaded WebVTT track, requires observed `currentTime` inside the active cue interval,
     and requires the active cue to change across a real scene boundary;
   - keyboard test now focuses the transcript link and presses Enter, accepting either a navigation or
     a download, then re-reads the served markdown resource;
   - telemetry test now performs a real clipboard copy (asserting the exact clipboard value) and a real
     play/seek/caption path, fails on playback errors instead of swallowing them, and instruments
     `fetch`, `XMLHttpRequest`, and `navigator.sendBeacon` in-page in addition to request monitoring.
5. Corrected one pre-existing assertion in the clipboard-failure test that compared viewport-relative
   `y` coordinates; the now-taller Get started section scrolls during the interaction. The invariant
   (the following command row does not move) is preserved by comparing document-relative offsets.

No CSS change was required: explicit native `::cue` styling (15px desktop, 16px at ≤640px) was already
present and was re-verified on the actual page.

---

## 2. Changed files

| File | Status | Bytes | SHA-256 |
|---|---|---|---|
| `website/src/landing/DemoPlayer.tsx` | modified (new file in tree) | 8,461 | `a39ab7ff5f68d49dbf9fe26402ad91355321cb7b96918d6e91905e5a824cd68b` |
| `website/tests/e2e/landing.spec.ts` | modified | 78,402 | `e4de111460908d810c0f6e55167589c6356f6abf6c697472ebcb4cd81132efbf` |
| `website/src/landing/demo-player.module.css` | unchanged this batch | — | `5e5bd76b188e785d7d0baa663e532662052630ab85ce459e45ed30c0ff3087f2` |
| `CHANGELOG.md` | modified (one Unreleased note) | — | — |

Published media (verified byte-identical to the accepted campaign sources; `shasum`/`stat`):

| Asset | Bytes | SHA-256 |
|---|---|---|
| `website/public/media/standards-demo-01.mp4` | 884,035 | `b129cb713dd681e6ad776d7ec35461454f165299e20a4227580712a12ea1c32f` |
| `website/public/media/standards-demo-01.vtt` | 976 | `fa9b316a21bf613146b0af935210a788ae009f38616316ede34fdbfd85bbaf05` |
| `website/public/media/standards-demo-01-transcript.md` | 8,222 | `e1b3a4647cf8e07efc3645abecec426463a6e681f40c663510c4d8e3fcb60388` |
| `website/public/docs/standards-tutorial.md` | 9,792 | `c76b06e2e4763677aac102f0ac95fec8f8df21703d5930aae655a84b0e32b4ef` |

---

## 3. Verification commands and actual results

1. `pnpm --dir website run typecheck` → `tsc --noEmit`, **0 errors**.
2. `pnpm --dir website run build` without `SITE_URL` → failed exactly with
   `Missing required SITE_URL environment variable. For local build and verification use: SITE_URL=http://127.0.0.1:4321`.
   Re-run as `SITE_URL=http://127.0.0.1:4321 pnpm --dir website run build` → static export succeeded,
   CSP generated (4 script hashes, 1 style-element hash, 7 style-attribute hashes), `_headers` 1,706 bytes.
   Build output remains local-only; no deployment occurred.
3. `pnpm --dir website exec playwright test -g "Demo video decodes|Keyboard users open|Playback, clipboard copy|No-JavaScript mobile page"`
   → **12 passed, 0 failed** (4 tests × desktop/mobile/tablet, 17.1s).
4. Full suite `pnpm --dir website exec playwright test`:
   - first run: **69 passed, 3 failed** — the three failures were the same clipboard-failure geometry
     assertion (viewport `y` comparison) across all projects;
   - after the document-relative correction: **72 passed, 0 failed** (51.5s).
5. Disposable surface observer against the fresh static export (removed after the run) recorded:
   - keyboard Enter on the focused transcript link → `navigation:http://127.0.0.1:4321/media/standards-demo-01-transcript.md`;
     resource `200`, `content-type: text/markdown; charset=utf-8`, 8,222 bytes;
   - desktop 1280×800 and mobile 390×844 playback at `currentTime ≈ 20.56`, `readyState 4`,
     decoded `1920×1080`, active cue `Native directories and lockfile are written; no MCP runtime config is touched while MCP stays disabled.`;
   - `document.scrollWidth` equals viewport width (1280 and 390); player width 1148 / 306 px;
   - zero external requests, zero non-GET requests, zero `fetch`/`xhr`/`ping`/`eventsource`/`websocket`
     requests, zero console errors on both sizes;
   - no-JavaScript 375×667: native `<details>` opened, transcript `href` present, `scrollWidth` 375.

Screenshots captured from the actual rendered page:

- `website/.playwright-cli/t10-corrected-desktop.png` (247,709 bytes) — playing at 20s with the active
  caption burned into the video surface plus the native caption line.
- `website/.playwright-cli/t10-corrected-mobile.png` (93,139 bytes) — 390px playback, 16px wrapped
  caption legible, links not clipped.
- `website/.playwright-cli/t10-corrected-nojs.png` (297,689 bytes) — JavaScript disabled, disclosure
  opened natively, transcript/download links rendered server-side.

---

## 4. Acceptance traceability (evidence, not self-signoff)

| Criterion | Evidence in this batch | Status |
|---|---|---|
| AC-23 observed landing hypotheses | Desktop/mobile surface observations and changes are recorded; no measured conversion loss or lift is claimed. | Local surface evidence; no conversion outcome |
| AC-24 deployment-dependent discovery | Only a local static export was exercised. Deployed-origin, indexing and domain checks remain unavailable. | Not passed by this batch |
| AC-27 evidenced captioned demo | Native `controls`, no `autoplay`, captions track, scene summary, transcript and download links, no-JS links, behavioral playback/caption tests. Native fullscreen interaction was not exercised by this worker; later parent evidence is in `task-10-parent-acceptance.md`. | Worker evidence plus separate parent acceptance |
| Tutorial link (supporting usability evidence, not AC-28) | `/docs/standards-tutorial.md` rendered by setup and remains in the no-JS surface. | Evidence recorded |
| AC-28 qualified measurement recommendation | This landing batch does not establish the measurement criterion. Synthetic scorecard evidence is recorded under T02 and the final walkthrough. | Outside this batch |
| AC-29 explicit-playback event | Collection intentionally disabled by user instruction; no `demo_play` event implemented. | Deferred; not done |
| AC-30 failed-copy event exclusion | Collection intentionally disabled; enabled event counting on clipboard failure was not exercised. | Deferred; not done |
| AC-31 disabled collection | In-page instrumented `fetch`/XHR/beacon list empty; zero non-GET and zero non-asset same-origin requests during navigation, clipboard copy, playback, seek, and disclosure toggle. | Evidence recorded (bounded to this session) |
| AC-32 bounded event payload | No event payload implemented; approved-field filtering and exclusion of raw URL/query/identity are not established by this batch. | Deferred; not done |

---

## 5. Limits and open gates

- Native fullscreen behavior remains **unexercised**; the headless harness does not provide a trusted
  native control surface.
- Scaled terminal text inside the 306px-wide mobile player is small; the transcript link remains the
  readable text alternative.
- The markdown transcript is served as `text/markdown` and navigates in Chromium; the test accepts a
  download on hosts that force one, but only the navigation branch was observed here.
- Absence of collection is bounded evidence for the exercised actions and page (no provider is wired);
  it is not proof about arbitrary future deployments.
- AC-16 remote release/published-origin verification and UAT signoff remain open. Assets are prepared
  locally only; no exposure or deployment authorization is implied by this report.
