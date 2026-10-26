# GA4 collection contract — provider and consent-first implementation approved, live collection not activated

## 1. Status and authority

The owner selected Google Analytics 4 (GA4) in PR #263 because an existing Google login is familiar and avoids adding another analytics provider account. The owner then explicitly selected **“Yes, implement consent-first GA4”** through `ask`, approving session-only analytics cookies (`cookie_expires: 0`) and Google's basic browser/session processing after visitor opt-in, with advertising features off and local implementation and testing only.

This contract replaces the previous Plausible implementation contract (`docs/product/evidence-led-marketing/plausible-collection-contract.md`) for all new implementation in PR #263. The prior Plausible implementation and local intercepted browser proof remain preserved as historical records.

This decision does **not** authorize live transmission, property/account creation, production deployment, billing changes, Google Ads linking, or public collection. The owner's explicit decision (*"Keep live collection blocked"*) remains in effect: implementation and local proof are included default-off in PR #263, while live transmission remains blocked at the owner boundary until an authorized non-secret Measurement ID (`G-*`), fixed HTTPS test URL, and bounded test approval are provided.

## 2. Approved implementation boundary & configuration gate
- **Direct Google tag**: Use direct `gtag.js` loading from `https://www.googletagmanager.com/gtag/js?id=<G-ID>`, not a Google Tag Manager (GTM) container, custom backend, or proxy. An existing Google login can manage the Google Analytics account container, property, and web stream; account, property, and stream creation remain future owner-authorized setup steps not yet created or authorized in this repository.
- **Strict environment variables**: Only clean GA4 variables are recognized; no Plausible environment variables or aliases are retained as active inputs:
  - `NEXT_PUBLIC_GA4_ENABLED`: must be explicitly `"true"`.
  - `NEXT_PUBLIC_GA4_OPERATOR_APPROVAL`: must be explicitly `"approved"`.
  - `NEXT_PUBLIC_GA4_MEASUREMENT_ID`: non-secret `G-[A-Z0-9]+` identifier.
  - `NEXT_PUBLIC_GA4_PAGE_URL`: approved fixed constant HTTPS origin/path (e.g. `https://analytics-test.invalid/approved-demo` as an unapproved example placeholder; actual domain not known), never dynamic `location.href`, query string, or hash.
- **Fail-closed default**: If any variable is missing, invalid, or unapproved, `isGA4Configured()` returns `false`. Unconfigured, invalid, and default builds emit zero analytics scripts, no preconnect links, no Google requests, and render no consent prompt.
- **Content Security Policy (CSP)**: Valid explicitly configured collection builds allow only exact reviewed endpoints (illustrated below; never drops existing 'self' or generated inline-script hashes):
  - `script-src`: adds exact token `https://www.googletagmanager.com/gtag/js` to existing `'self'` and generated inline script hashes (no `'unsafe-inline'`).
  - `connect-src`: `'self' https://www.google-analytics.com/g/collect https://region1.google-analytics.com/g/collect` (exact endpoints only; no wildcard Google domain exemptions).
  Default and unconfigured builds retain strict `connect-src 'self'` and emit no analytics script tags.

## 3. Application events and closed payload properties

The four canonical user-initiated application actions from SRS-009 are preserved:

| Event name | Trigger condition | Placement allowlist |
| --- | --- | --- |
| `demo_play` | Explicit **Play demo (56s)** activation followed by actual successful decoded playback (`playing`); once per media instance / page lifecycle. Never on render, failed start, programmatic `video.play()`, or native pause-resume. | `quickstart_demo` |
| `install_command_copy` | Actual resolved, non-stale clipboard write success. Never on clipboard rejection or manual-recovery fallback. Clipboard contents are never collected. | `quickstart_init`, `quickstart_sync` |
| `setup_guide_open` | Explicit user click on a setup documentation or tutorial link. | `quickstart_docs`, `quickstart_tutorial` |
| `github_click` | Explicit user click on a primary GitHub repository link. | `header_github`, `community_github`, `footer_github` |

### Application properties mapping

Every dispatched event passes strictly bounded application properties:
- `schema_version`: integer `1`.
- `campaign_id`: registered campaign identifier (e.g. `standards-demo-01`) or normalized to `"unknown"`.
- `asset_id`: associated registered asset identifier or normalized to `"unknown"`.
- `placement`: allowlisted placement identifier or normalized to `"unknown"`.
Fixed page context is set on initialization:
- `page_location`: approved constant HTTPS origin/path.
- `page_title`: approved exact static title `'Agent Skills Standard'`.
- `page_referrer`: explicitly set to empty string `""`.
- `send_page_view`: explicitly `false` in code. Enhanced Measurement must also be disabled in property stream settings (operator responsibility; not code-enforced).
- `send_to`: omitted from event parameters; dispatches strictly to the single approved Measurement ID destination.

## 4. Demo video entry: explicit first start, then native controls

Per the owner's explicit UX decision (*"Explicit start, then native controls"*):
- **Default/unconfigured builds**: Existing native `<video controls>` player is unchanged; no analytics button is rendered.
- **Configured collection builds with JS**: Client hydration renders an accessible **Play demo (56s)** button as the initial entry. Trusted activation calls `video.play()`. Only actual successful decoded playback reveals native video controls and emits `demo_play`.
- **Native controls available afterward**: Native pause, resume, seek, captions, and fullscreen are not intercepted, and resume is never recounted.
- **No-JS / SSR fallback**: Server-rendered player retains native controls and renders no inert button; playback without JavaScript remains fully usable and emits zero events.

## 5. Cookie, session, and privacy disclosures
- **Session-only cookies**: Google tag is initialized with `cookie_expires: 0`. Analytics cookies (`_ga`, `_ga_<container-id>`) expire when the browser session ends as defined by the user's browser, **not** on tab close or page reload, with no guarantee against browser session restoration.
- **Cookie domain and path**: The implementation sets documented `cookie_domain: 'none'` and `cookie_path: '/'` on initialization; it does not set `cookie_prefix`, and no absolute cross-domain leak prevention guarantee is claimed.
- **Advertising features disabled**:
  - `allow_google_signals: false`
  - `allow_ad_personalization_signals: false`
  - `gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' })`
  - No Google Ads linking, connected ad destinations, or enhanced conversions.
- **Truthful processing disclosure**: Google Analytics standard processing includes:
  - Automatically collected events: `first_visit`, `session_start`, `user_engagement`.
  - Google-generated pseudonymous client ID and session ID cookies.
  - Browser/device metadata: language, screen resolution, user agent, approximate coarse geolocation.
  - Network IP processing by Google servers (Google states IP addresses are used for geolocation and dropped before storage in GA4; this is not a claim of zero IP processing).
  - Data storage is on Google infrastructure and is not aggregate-only or EU-only.

## 6. Consent, withdrawal, and failure isolation

- **Basic consent mode**: The Google tag script is **blocked until consent** is granted. Zero network requests, cookies, or denied-state pings are sent before explicit visitor opt-in.
- **In-memory consent state**: Consent defaults to undecided on every page load; reload requires fresh opt-in. Zero consent state is persisted to local storage or cookies.
- **Synchronous withdrawal**: When the visitor withdraws consent:
  - App state gate closes immediately.
  - Global `window['ga-disable-' + measurementId] = true` is set synchronously before any further tag calls.
  - In-flight action epochs are invalidated.
  - Accessible cookies managed by the application are cleared.
  - Disclosed limitation: withdrawal cannot recall requests already transmitted over the network or erase previously received data from Google servers.
- **Transport failure isolation & terminal script error**: Network or transport failures (e.g. ad-blocker blocking, offline status, or endpoint downtime) are caught silently and never block media playback, clipboard actions, navigation, or recovery. A Google tag script load error fails closed terminally until page reload — zero automatic retries, zero event queueing, and zero re-activation upon subsequent consent toggles within the same page lifecycle. (Policy verified at mock command boundary in [ga4-browser-acceptance.md](../../../artifacts/evidence-led-marketing/ga4-browser-acceptance.md)).

## 7. Acceptance criteria & live test gate

1. **Design and local application boundary verification**:
   - Local application integration verified: 40/40 website unit on Node 26, explicit project `tsc` PASS, lint PASS, Turbopack static export with `SITE_URL` PASS, 72/72 production E2E in 53.1s, and parent standalone Playwright API probe receipt [ga4-browser-acceptance.md](../../../artifacts/evidence-led-marketing/ga4-browser-acceptance.md) (19 cases, 69/69 assertions PASS, interval 2026-10-26T08:33:50.519Z–08:34:17.617Z; companion `ga4-browser-acceptance.json`; reviewer approval pending).
   - Verified under `LOCAL_FAKE_SDK_RAW_COMMAND_BOUNDARY_ONLY`: explicit first-start demo playback (.508s–.526s), copy/nav event normalization, pending-load/withdrawal/regrant no stale queue, terminal script error with no retries, no-JS native controls, programmatic/pre-consent 0, synthetic cookie cleanup, and desktop + 375 initial overlay axe 0.
   - Player source SHA-256: `88c289d08cdd68e9454a417e98478ada38195c076f8751233a4dd41f71820b9e`; context SHA-256: `16b86e4028cc09d72cae7443720ff97f0c290a8b13da05e0500b386c3a6da4c8`; consent banner prefix: `26dfd1…`.
   - Local mock command tests do **not** establish real Google SDK execution, actual network delivery, wire closed fields, or Google Analytics dashboard receipt.
2. **Live collection gate (BLOCKED_OWNER)**:
   - Live transmission remains blocked under the owner's explicit decision (*"Keep live collection blocked"*).
   - Real provider verification requires:
     - Non-secret `G-*` Measurement ID from an approved Google Analytics property.
     - Confirmation that Enhanced Measurement is disabled in the web stream settings.
     - Approved constant test URL origin.
     - Written human owner authorization for bounded test events, spend, and duration.
   - Until these prerequisites are met and live receipts are observed, T08 remains **OPEN**.

## 8. Official sources

- [GA4 Tag Reference & Config: cookie_expires](https://developers.google.com/analytics/devguides/collection/ga4/reference/config#cookie_expires)
- [Tag Platform Consent Mode](https://developers.google.com/tag-platform/security/concepts/consent-mode)
- [Tag Platform Privacy: Turn off Google Analytics](https://developers.google.com/tag-platform/security/guides/privacy#turn_off_google_analytics)
- [GA4 Automatically Collected Events](https://support.google.com/analytics/answer/9234069?hl=en)
