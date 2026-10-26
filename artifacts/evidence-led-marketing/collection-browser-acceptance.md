# Configured collection browser acceptance

**PASS — LOCAL_INTERCEPTED_ONLY.** Independent parent execution of the actual isolated production static build passed **10 cases, 37/37 assertions**, after inspecting the probe and network/behavior assertions. Independent review approved the bounded source and public evidence projections. **Real provider receipt and live collection remain BLOCKED_OWNER. T08 is not complete.**

Parent-observed run: `2026-10-26T06:42:14.455Z`–`2026-10-26T06:42:34.248Z`. Runtime: Node.js `v22.14.0`, Chromium `156.0.8078.4`, installed `@playwright/test` API. Driver preflight found no `playwright-cli`; the authorized standalone API probe supplied the runtime evidence. The earlier worker run independently passed the same frozen source; figures below describe the latest parent run.

## Approved contract and preserved failure history

The original native-entry implementation failed actual native Space and native play-button pointer playback attribution. Both started decoded media but sent zero `demo_play`. The bounded keyboard trace showed capture microtasks still observing paused media before the native transition. A separate native-pointer trace observed no pointerdown/mousedown/click at window/document capture and no pointer/click at video capture. This observation is Chromium-specific; trusted media events alone do not prove user intent.

The owner then explicitly selected **“Explicit start, then native controls.”** In a configured JavaScript artifact, a hydrated accessible **Play demo (56s)** button is the initial entry; trusted activation calls `video.play()`, and actual successful playback reveals native controls. No-JS retains server-rendered native controls and no inert button. Default/unconfigured behavior remains the native-player contract; this configured-only run did not rebuild or rerun that default artifact.

Original failed scripts and receipts remain private and unchanged. This acceptance does **not** retrospectively pass the old native-entry implementation or silently replace its criteria.

## Actual revised cases

| Case | Assertions | Collector events | Observed result |
| --- | ---: | ---: | --- |
| Real pointer button click | 5 | 1 | Decoded time 0.514118s; controls initially hidden, then revealed; focus transferred; exact payload; native pause/resume not recounted |
| Real Enter on focused button | 5 | 1 | Decoded time 0.518246s; same control, focus, payload and dedupe checks |
| Real Space on focused button | 5 | 1 | Decoded time 0.515595s; same control, focus, payload and dedupe checks |
| Pointer at 375×667 viewport | 5 | 1 | Decoded time 0.511677s; same checks; desktop Chromium viewport coverage, not mobile-touch or physical-device certification |
| Pre-consent start, then late opt-in | 3 | 0 | Actual playback remains usable; no replay at opt-in or native resume |
| Pending start, withdrawal/regrant | 4 | 0 | Explicit deferred-play boundary mock releases into original actual playback; old consent epoch suppressed; controls revealed |
| Rejected start, retry | 3 | 1 | One-time rejection boundary mock preserves accessible retry without event; retry uses original actual decoded playback and counts once |
| Programmatic playback without button | 2 | 0 | Actual playback adopted without attribution or leftover overlay |
| Configured no-JS | 3 | 0 | SSR native controls; no inert button; native Space decodes playback to 0.843306s |
| Declined consent | 2 | 0 | Explicit playback and controls work without transmission |
| **Total** | **37** | **5** | **PASS** |

Positive playback was real decoded media (`paused=false`, `currentTime>0.15`, `readyState>=2`), never synthetic `playing` dispatch or `isTrusted` overrides. Only the named pending/rejection boundaries used media mocks; their successful release/retry invoked the original media implementation.

The probe enforces the expected 10 cases, per-case counts, and 37 actual assertions; observations are not counted as assertions. BUG/BLOCKED sets a nonzero process exit code. This run exited **0**, with no page errors.

## Build, identity and commands

Build mode: **Next.js 16.4.1 `--webpack` static export**, in an owned disposable source copy with existing dependency symlink; no dependency install. These artifact hashes do not assert identity with default Turbopack output or a deployment.

Synthetic-only build configuration:

```text
NEXT_PUBLIC_PLAUSIBLE_ENABLED=true
NEXT_PUBLIC_PLAUSIBLE_OPERATOR_APPROVAL=approved
NEXT_PUBLIC_PLAUSIBLE_SITE_ID=synthetic-test.example
NEXT_PUBLIC_PLAUSIBLE_PAGE_URL=https://synthetic-test.example/approved-test
NEXT_TELEMETRY_DISABLED=1
SITE_URL=<ephemeral HTTP loopback origin>
```

Actual command shapes below retain arguments while redacting personal executable, dependency and private probe paths. Full exact commands remain in the private receipt.

```text
rtk proxy node <PRIVATE_PROBE>/t08-explicit-start-probe.mjs
rtk proxy <NODE_EXECUTABLE> <RESOLVED_NEXT_BIN> build --webpack
rtk proxy <NODE_EXECUTABLE> scripts/generate-headers.mjs
```

All three observed invocations exited 0. Header generation covered three exported HTML files and emitted 1,737 bytes. Parent-run generated `_headers` SHA-256: `986f807342ee5f210a7f4f5705293ba256e01fa57a0fa194bbe8f2155bafdbdb`. Generated index SHA-256: `5dc8d5c0b921e92814679ecef7426fb998dafdd5002c018b777bb53b9d8bbe7f`.

Frozen player SHA-256: `cbc94bb5d1dc6f4fc72bf7d5a5e22bb01f14b3de6e869b4d58361bfc1c189412`. Full player/CSS/context/client/config/predicate/header-generator/regression-test/document hashes are recorded in the companion [JSON projection](collection-browser-acceptance.json).

## Network and visual boundaries

Context interception was installed **before navigation**. Same-origin loopback was allowed; all five collector POSTs to `https://plausible.io/api/event` were locally fulfilled with synthetic 202. Every other outbound request was blocked; none was attempted in this revised run. **Zero actual provider transmissions.**

Each observed event contained exactly:

```json
{"name":"demo_play","domain":"synthetic-test.example","url":"https://synthetic-test.example/approved-test","props":{"schema_version":1,"campaign_id":"standards-demo-01","asset_id":"unknown","placement":"quickstart_demo"}}
```

Observed request contract: POST, `Content-Type: text/plain`, no Referer or Cookie headers. No current query, fragment, clipboard contents or clicked destination in the payload. Generated CSP had exact `connect-src 'self' https://plausible.io/api/event`; the private server applied it. This is not edge-host validation.

Actual post-start playback screenshots were retained privately at **1440×1000** and **375×667**. Scoped figure axe scans reported zero violations at both viewports.

A separate bounded **initial-overlay** addendum ran on the earlier staged build with identical frozen source hashes, `2026-10-26T06:43:30.240Z`–`2026-10-26T06:43:31.855Z`. Before playback, both viewport captures showed an enabled focused Play demo button, paused media and hidden native controls. Focus outline was **3px solid**; button dimensions were **111.3125×52px** desktop and **111.3125×48px** at 375×667. Scoped figure axe scans reported **zero violations**, with zero provider requests and page errors. Both initial-overlay images were visually inspected and retained privately.

These additional visual/focus/a11y observations are **separate from the 37 main assertions**. The smaller viewport did not emulate a touch/mobile browser. No private screenshots were copied into this projection. This is not full WCAG or screen-reader certification.

## Prior non-playback evidence, not rerun

The initial `2026-10-26T04:29:38.400Z`–`2026-10-26T04:30:01.341Z` run was **BUG overall**, owing to native playback attribution. Its separate checks passed: preconsent/withdrawal/reload gating; actual clipboard success and one copy event with unknown asset; denied-copy manual selection; explicitly mocked deferred clipboard consent races; setup/GitHub single classification; primary actions preserved under unavailable transport; closed copy/link payloads without Referer/Cookie; exact enabled CSP applied locally; and desktop/mobile notice scoped axe scans.

Those are historical checks, **not reexecuted by the final playback probe**. Original receipt context/client/config/predicate/header-generator hashes match the final run. Original and rechecked CopyCommand SHA-256 is `9fc07c69aed659e504b3481286f8656b06e9e66c5401a53076cf9f7938bbd3b8`. Original playback code differed and failed; its positives are not reused. Link observations are not a fresh final link-component verification.

## Remaining limits

- Parent inspected the probe and independently executed the actual 10-case/37-assertion program successfully. Independent review approved the bounded source and public projections; provider or human acceptance is not implied.
- Real provider receipt, provider CORS/drop behavior, accounts, billing, deletion/retention and production/edge acceptance remain unproven. Live collection remains blocked by the owner.
- No claim all T08 or all delivery gates are complete.
- Earlier clipboard/link/privacy evidence is historical and source-bound, not rerun by this playback-only probe.
- Owned browser and loopback server were closed. Private staged build and receipts remain available for independent inspection.
