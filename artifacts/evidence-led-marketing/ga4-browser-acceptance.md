# GA4 application-boundary browser acceptance

**PASS — LOCAL_FAKE_SDK_RAW_COMMAND_BOUNDARY_ONLY. Independent bounded source/evidence review approved; not human/provider/wholeinitiative acceptance.** Parent inspected and executed the actual standalone installed Playwright API probe: **19 cases, 69/69 assertions, exit 0**. Observed receipt interval: **2026-10-26T08:33:50.519Z–2026-10-26T08:34:17.617Z**.

**No actual Google SDK was executed. No live Google fetch or collection occurred. Live collection remains BLOCKED_OWNER.** This result is not real provider receipt, Google cookie verification, CORS, edge or deployment acceptance, and does not complete all T08/T12 gates.

## Authority and history

The [approved GA4 collection contract](../../docs/product/evidence-led-marketing/ga4-collection-contract.md) records the owner's selection of consent-first GA4, session-only analytics-cookie configuration and basic Google processing, advertising off, implementation/local tests only. It replaces the previous Plausible implementation contract. The [previous collection browser acceptance](collection-browser-acceptance.md) and its [JSON](collection-browser-acceptance.json) remain historical Plausible proofs, not GA4 evidence.

Original native-entry playback attribution failed despite real decoded playback. The owner explicitly selected **explicit first start, then native controls** for configured JavaScript artifacts; this was a contract decision, not a retroactive pass of the failed native-entry code.

Before this final GA4 checkpoint, source inspection/review found queue identity/discard, complete advertising denial, failure-regrant and orphan-script/remount lifecycle gaps. An earlier parent unit checkpoint passed 38 of 39 tests and failed one incidental region-name wording assertion; that incidental test was removed rather than repinned. These historical findings are not disguised as successful browser cases or claimed failing-browser reproductions. The final source identities below bind this actual parent run. No browser remount scenario was exercised here; separate unit/review evidence belongs to parent gates.

## Transparent local SDK boundary

Every browser context installed external-request interception **before navigation**. Only same-origin loopback assets were allowed. The exact Google tag request was fulfilled with an explicitly named **LOCAL FAKE SDK / RAW COMMAND RECORDER**, held for the loading-race case, or aborted for the failure case. Every other external request—including Google collection and external link destinations—was blocked.

The recorder unconditionally captures queued and subsequently pushed app commands. It does **not** implement consent or disable gates, so it cannot hide an application event by suppressing it. It retains prior commands across actual script reinjection and does not autonomously repair a replaced application queue. It has no Google networking or cookie behavior. Recorded `cookie_expires: 0` is an application configuration observation, not proof of real SDK session-cookie expiry, browser-session lifetime or Google's processing.

No full raw command histories, private helper source, absolute private paths, loopback ports, visitor/session identifiers or raw browser headers are exported here.

## Actual parent runtime cases

| Case | Assertions | Actual proof / boundary |
| --- | ---: | --- |
| Configured no consent | 3 | No external tag/collection, config/grant/event or legacy Plausible script |
| Trusted pointer | 5 | Real button click; decoded media time 0.526179s; exact one normalized event; revealed controls/focus; native resume not recounted |
| Trusted Enter | 5 | Real keyboard activation; decoded time 0.508492s; same event/control/dedupe checks |
| Trusted Space | 5 | Real keyboard activation; decoded time 0.508220s; same event/control/dedupe checks |
| Pre-consent playback | 3 | Real playback works; late opt-in and resume do not replay it |
| Programmatic playback | 2 | Actual media adopted without attribution or stale overlay |
| Configured no-JS | 3 | Native controls, no inert button; actual native decoded time 0.582077s; no tag/collection |
| Real clipboard copy | 2 | Actual write/read matches command; one normalized event, unknown asset, no command contents |
| Deferred copy before consent | 2 | Named clipboard mock; completion after opt-in emits nothing |
| Deferred copy then withdrawal | 2 | Named clipboard mock; withdrawn completion emits nothing |
| Deferred copy then withdrawal/regrant | 2 | Named clipboard mock; old action not revived |
| Setup/GitHub links | 3 | One exact classified event per action, two total; external navigation blocked |
| Pending tag / withdrawal / regrant | 8 | Held local script; current pre-release queue has no stale config/event/grant; late callback cannot restore it; disable set; all three Ads fields denied before drain and every grant update; explicit update-grant follows denied; no old replay; fresh **real** sync copy emits once |
| Tag abort / terminal failure | 6 | Real clipboard/video and setup navigation attempt work; no added config/grant/event; disable true; reload-only failure status and no opt-in; one tag request/no retry; fresh real copy still works. Actual terminal UI offered no regrant; no hook forced it |
| Reload | 2 | New opt-in required; no new tag request or grant/config/event |
| Effective configuration / CSP | 5 | Folds preceding global `set` and stream overrides; session expiry zero, Ads/signals disabled, constant page metadata, pageview false; exact CSP; no legacy provider |
| Desktop initial surface | 4 | 1440×1000 notice actionable before SDK; initial focused button 3px outline; paused controls-hidden overlay; scoped axe zero violations |
| Mobile-sized initial surface | 4 | Same at 375×667; **viewport-only desktop Chromium, not mobile-touch emulation** |
| Synthetic cookie cleanup | 3 | Explicit fixtures: app deletes owned `_ga`/`_ga_TEST123456`, sets disable, preserves `_ga_UNRELATED`; **not SDK-created cookies** |
| **Total** | **69** | **19 cases PASS** |

Real positive playback required `paused=false`, `currentTime>0.15` and decoded media readiness. No synthetic `playing` positive, `isTrusted` override or fake media success was used. Deferred clipboard and held-script cases are explicitly named boundary mocks. Real successful clipboard operations remained actual browser write/read operations.

The probe enforces both per-case and total counts; incomplete, BUG or BLOCKED results exit nonzero. Actual parent execution exited 0, with 69 passed assertions, no failed assertions and no page errors. Screenshots stay private for parent/reviewer inspection; this projection does not claim an independent screenshot review.

## Bounded command/configuration observations

Synthetic measurement ID: `G-TEST123456`, **not an authorized live property**. Constant page URL: `https://analytics-test.invalid/approved-demo`; title `Agent Skills Standard`; empty page referrer. Build enables GA4 and explicit operator-approval flags synthetically, with telemetry disabled and an ephemeral loopback site origin.

Observed effective configuration:

```json
{"cookie_expires":0,"cookie_domain":"none","cookie_path":"/","cookie_flags":"SameSite=Lax;Secure","allow_google_signals":false,"allow_ad_personalization_signals":false,"send_page_view":false,"page_location":"https://analytics-test.invalid/approved-demo","page_title":"Agent Skills Standard","page_referrer":""}
```

Each application event has exactly `schema_version`, `campaign_id`, `asset_id`, `placement`; no `send_to` event parameter. Advertising consent fields `ad_storage`, `ad_user_data`, `ad_personalization` remain denied. These command observations do not demonstrate the real SDK's automatic events or metadata behavior, and property-side settings remain outside this local proof.

Generated and locally applied CSP includes:

```text
script-src Google token: https://www.googletagmanager.com/gtag/js
connect-src 'self' https://www.google-analytics.com/g/collect https://region1.google-analytics.com/g/collect
```

Other generated self/hash security restrictions remain in the artifact. This is not proof an edge host deployed or enforced those headers.

## Source and build identity

Node.js **v22.14.0**; Chromium **156.0.8078.4**. Authorized installed Playwright API driver reused; earlier preflight found no `playwright-cli`. One isolated **Next.js `--webpack` static export** was built with existing dependencies, not a new install or shared delivery output. These hashes are not default Turbopack or deployed-artifact identity.

Actual command shapes, with private executable/dependency/probe paths redacted:

```text
rtk proxy node <PRIVATE_PROBE>/ga4-browser-probe.mjs --source-frozen --player-sha256=<frozen player hash> '--page-title=Agent Skills Standard' --page-referrer= "--connect-src=connect-src 'self' https://www.google-analytics.com/g/collect https://region1.google-analytics.com/g/collect" --script-tag-source=https://www.googletagmanager.com/gtag/js
rtk proxy <NODE_EXECUTABLE> <RESOLVED_NEXT_BIN> build --webpack
rtk proxy <NODE_EXECUTABLE> scripts/generate-headers.mjs
```

- Player SHA-256: `88c289d08cdd68e9454a417e98478ada38195c076f8751233a4dd41f71820b9e`
- GA4 context SHA-256: `16b86e4028cc09d72cae7443720ff97f0c290a8b13da05e0500b386c3a6da4c8`
- Generated headers SHA-256: `43d0c609777e4ba251af4f0edee9477cb0ef5f31c94a2d6a9f3e5de256802fbe`
- Generated index SHA-256: `6e1085468f5c1fb93af5c4b115fd6e58c9319a5cbf6e16e335214d7dd6267843`

Full source hashes for player/CSS/copy/banner/context/client/config/predicate/header generator and exact accounting are in the companion [JSON projection](ga4-browser-acceptance.json).

## Limits and remaining gate

- **Independent bounded source/evidence review approved; not human/provider/wholeinitiative acceptance.** Parent actual execution is established.
- No real Google SDK, Google-created cookies, cookie expiry, automatic metadata/session processing, collection transport or provider receipt demonstrated.
- No account/property creation, CORS, production/edge deployment or live transmission authorized or exercised.
- Scoped axe scans and viewport screenshots are not comprehensive accessibility, screen-reader, touch-browser or physical-device certification.
- Configured undecided-consent coverage is not a separate default-unconfigured build. Parent default build/E2E/unit/type/lint gates are separate and not counted among these 69 assertions.
- No all-T08/T12 completion claim. Live collection remains blocked by owner decision.
- Owned browser/server closed; private source-bound staged build and receipt retained. Earlier helpers and receipts remain unchanged by this projection task.
