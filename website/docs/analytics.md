# Website Analytics Contract & Operations Runbook (GA4)

## Status and authority

Website analytics is **disabled by default**. In accordance with SRS-009, PRD REQ-017, and the approved GA4 collection contract (`docs/product/evidence-led-marketing/ga4-collection-contract.md`), no telemetry script, collector, SDK, or network request is emitted in unconfigured, local, preview, or default builds.

The owner selected Google Analytics 4 (GA4) for PR #263 for familiarity and fewer provider accounts, and explicitly selected **“Yes, implement consent-first GA4”** through `ask`, approving session-only analytics cookies (`cookie_expires: 0`) and Google's basic browser/session processing after visitor opt-in, with advertising features off and local implementation and testing only. This supersedes the previous Plausible implementation, which remains preserved as an immutable historical delivery record (`docs/product/evidence-led-marketing/plausible-collection-contract.md`).

Enabling collection requires an explicit human operator approval gate and valid non-secret configuration. A build flag alone is **not** authorization to collect data. Live collection remains deliberately blocked by owner decision (*"Keep live collection blocked"*); T08 remains open until an authorized non-secret Measurement ID (`G-*`), fixed HTTPS test URL, and bounded test authorization are provided.
Local application integration is verified in PR #263 across 40/40 unit tests on Node 26, explicit project `tsc` PASS, lint PASS, Turbopack static export with `SITE_URL` PASS, 72/72 production E2E in 53.1s, and parent standalone Playwright API probe receipt [ga4-browser-acceptance.md](../../artifacts/evidence-led-marketing/ga4-browser-acceptance.md) (19 cases, 69/69 assertions PASS in 27.34s) under `LOCAL_FAKE_SDK_RAW_COMMAND_BOUNDARY_ONLY` (mock command boundary only, not Google wire/cookies; player source `88c289d0…`, context `16b86e40…`). Live collection remains blocked by owner decision; real provider receipt and production deployment are not authorized.

## Architecture: Direct Google Tag (`gtag.js`)

The website implements a direct browser integration with GA4 using the Google tag (`gtag.js`):

- **Direct tag script**: Loaded directly from `https://www.googletagmanager.com/gtag/js?id=<G-ID>` upon explicit consent.
- **No Google Tag Manager (GTM) container**: No GTM web container (`gtm.js`) or third-party tag orchestration is used.
- **No backend or proxy**: Direct browser connection with failure isolation.
- **Basic consent mode (blocked until consent)**: The Google tag script is not injected and does not execute prior to visitor opt-in. No denied-state pings or pre-consent network requests are sent.
- **No automatic pageviews in code**: `send_page_view: false` is configured on initialization. Enhanced Measurement must also be disabled in property stream settings by the operator.
- **Session-only cookies**: Documented `cookie_expires: 0` ensures Google analytics cookies (`_ga`, `_ga_<container-id>`) expire when the browser session ends, rather than the default two-year expiry.
- **Advertising features disabled**: Google Signals (`allow_google_signals: false`), ad personalization (`allow_ad_personalization_signals: false`), and advertising consent types (`ad_storage: 'denied'`, `ad_user_data: 'denied'`, `ad_personalization: 'denied'`) are strictly disabled. No Google Ads linking, connected ad destinations, or enhanced conversions.
- **Preserved static export**: Static Next.js export (`output: 'export'`), server pre-rendering, accessible captions, and no-JavaScript navigation remain fully functional. Without JavaScript the demo keeps its native video controls.

## Demo video entry: approved explicit first start

Collection builds use an explicit, accessible entry for the demo video so that only a genuine user activation can begin counted playback, resolving unobservable User-Agent shadow DOM media pointer events:

- **Default/unconfigured builds**: The existing native `<video controls>` player is unchanged and no analytics entry control is rendered, because no collection exists.
- **Configured collection builds with JS**: After client hydration, an accessible **Play demo (56s)** button is the initial entry that initiates counted playback. Its trusted click/keyboard activation calls `video.play()`. The entry is rendered whenever collection is configured, independent of the current consent state: declining or starting before opt-in still plays the media, emitting nothing.
- **Native controls available afterward**: Native controls are hidden only until the first successful decoded playback (`playing`), then revealed for the rest of the page lifecycle. Pause, resume, seek, captions, volume, and keyboard control are never intercepted, and resume is never recounted. Playback that began through the server-rendered native controls before hydration is adopted as already started, without reloading media and without attribution.
- **No-JS / SSR**: The server-rendered player keeps native controls and renders no inert button; the explicit entry requires hydration. Native playback without JavaScript remains usable and emits zero analytics events.
- **Failed start**: A rejected or failed `playing` attempt is reported with an accessible retry button and emits nothing. The primary media path is never blocked.
- **Consent binding**: The consent snapshot is captured at the explicit start activation. Starting before opt-in plays the media and emits nothing; later opt-in never replays that start, and withdrawing or re-granting while the start is pending invalidates the pending epoch.
- **Programmatic play**: `video.play()` invoked without the explicit trusted activation emits nothing.

## Configuration & operator approval gate

For collection to become active, all of the following build-time inputs must be explicitly set and validated:

| Environment variable | Purpose | Validation rules |
| --- | --- | --- |
| `NEXT_PUBLIC_GA4_ENABLED` | Feature switch | Must be explicitly `"true"`. |
| `NEXT_PUBLIC_GA4_OPERATOR_APPROVAL` | Operator approval gate | Must be explicitly `"approved"`. Documented human signoff is required. |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | GA4 Web Stream Measurement ID | Valid non-secret `G-[A-Z0-9]+` identifier. |
| `NEXT_PUBLIC_GA4_PAGE_URL` | Fixed constant HTTPS URL | Absolute HTTPS origin/path (e.g. `https://analytics-test.invalid/approved-demo` as an unapproved example placeholder; actual domain not known). Must **never** be dynamic `location.href`, query string, or hash. |

If **any** of these inputs is missing, invalid, or unapproved:
1. `isGA4Configured()` returns `false`.
2. The consent prompt is not rendered in default builds, preventing unnecessary UI intrusion.
3. All event dispatch functions immediately return with zero network activity.
4. CSP headers generated by `scripts/generate-headers.mjs` retain strict `connect-src 'self'`.
## Future setup procedure (operator guidance)

When the owner explicitly decides to authorize live collection, setup follows these plain-language steps:

1. **Use existing Google login**: Do not sign up for a new third-party analytics provider or register a new Google login. The owner's motivation for selecting GA4 is familiarity with their existing Google account.
2. **Create GA4 Account / Property & Web data stream**:
   - Under that existing Google login, setup may require creating a logical Google Analytics account container, a GA4 property, and a Web data stream. (Note: account container, property, and stream creation are future owner-authorized setup steps not yet created or authorized in this repository).
3. **Disable automated tracking & ad destinations**:
   - In stream settings, disable all **Enhanced Measurement** (turn toggle off).
   - In property settings, ensure **Google Signals** is disabled and **Ad personalization** is turned off.
   - Ensure zero Google Ads accounts or linked ad destinations are connected.
4. **Copy non-secret Measurement ID & approve constant URL**:
   - Copy the non-secret `G-[A-Z0-9]+` Measurement ID.
   - Approve the fixed constant HTTPS URL origin (e.g. `https://analytics-test.invalid/approved-demo` as an unapproved example placeholder; actual domain not known).
   - Set build environment variables:
     - `NEXT_PUBLIC_GA4_ENABLED="true"`
     - `NEXT_PUBLIC_GA4_OPERATOR_APPROVAL="approved"`
     - `NEXT_PUBLIC_GA4_MEASUREMENT_ID="<G-ID>"`
     - `NEXT_PUBLIC_GA4_PAGE_URL="<APPROVED_HTTPS_URL>"`
   - **No credentials required**: The repository requires zero passwords, private API keys, or service account credentials.
5. **Exact parameters & cookie boundary**:
   - Static context: `page_title` is exact `'Agent Skills Standard'`, `page_referrer` is strictly empty `""`.
   - Event parameters: Dispatched with exactly the 4 closed application properties (`schema_version: 1`, `campaign_id`, `asset_id`, `placement`); no `send_to` parameter is used, routing strictly to the single approved Measurement ID destination.
   - Session cookie lifecycle: `cookie_expires: 0` expires cookies when the browser session ends as defined by the user's browser, not on tab close or page reload, with no guarantee against browser session restoration.
6. **Deliberate block maintained**: All real Google network calls remain blocked by owner decision (*"Keep live collection blocked"*) until an authorized test site ID, fixed HTTPS URL, and bounded test approval are explicitly granted.

## Consent, privacy notice, and withdrawal

1. **Explicit opt-in**: Collection is dormant until the visitor explicitly clicks "Accept analytics".
2. **In-memory only consent state**: Consent state (`granted` or `denied`) is held strictly in in-memory React state and ref, defaulting to `undecided` on every page load. Strictly zero `sessionStorage` or `localStorage` is used for application consent.
3. **Immediate synchronous withdrawal**: Visitors can withdraw consent at any time. Withdrawal immediately:
   - Closes the application event gate.
   - Sets Google's documented global disable flag `window['ga-disable-' + measurementId] = true` synchronously before any further tag calls.
   - Invalidates in-flight action tokens.
   - Clears application-managed cookies where accessible.
   - Note: withdrawal cannot recall requests already transmitted over the network or erase previously received data from Google servers.
4. **No pre-consent buffering**: Events triggered prior to explicit opt-in are **never** buffered, queued, or replayed upon consent.
5. **Truthful privacy notice**: The consent interface discloses that:
   - Session-only cookies (`_ga`, `_ga_<container-id>`) are set with `cookie_expires: 0`.
   - Google Analytics standard processing includes automatically collected events (`first_visit`, `session_start`, `user_engagement`) and Google-generated pseudonymous client/session IDs.
   - Browser metadata (screen resolution, language, user agent) and network IP are processed by Google servers.
   - Storage is on Google infrastructure and is not aggregate-only or EU-only.
   - The notice links to Google Analytics privacy documentation.

## Allowed events and closed application fields

Only four application events are defined and permitted:

| Event name | Trigger condition | Placement allowlist |
| --- | --- | --- |
| `demo_play` | Explicit **Play demo (56s)** activation followed by actual successful decoded playback (`playing`); once per media instance / page lifecycle. Never on render, failed start, programmatic `video.play()`, or native pause-resume. | `quickstart_demo` |
| `install_command_copy` | Actual resolved, non-stale clipboard write success. Never on clipboard rejection or manual-recovery fallback. Clipboard contents are never collected. | `quickstart_init`, `quickstart_sync` |
| `setup_guide_open` | Explicit user click on a setup documentation or tutorial link. | `quickstart_docs`, `quickstart_tutorial` |
| `github_click` | Explicit user click on a primary GitHub repository link. | `header_github`, `community_github`, `footer_github` |

### Closed payload parameters

Every application-defined event dispatch passes strictly bounded parameters (Google Analytics standard transport automatically includes documented provider session, context, and client fields in the full network request envelope):

- `schema_version`: `1`
- `campaign_id`: registered campaign identifier (e.g. `standards-demo-01`) or normalized to `"unknown"`.
- `asset_id`: associated registered asset identifier (`tutorial-standards-adoption-01`, `announcement-github-01`, `showcase-community-01`) or normalized to `"unknown"`.
- `placement`: allowlisted placement identifier or normalized to `"unknown"`.
- Static context: `page_location` (approved constant HTTPS origin/path), `page_title` (static title), and `page_referrer` (empty string).
- Arbitrary URL query parameters, referrers, user IDs, or code snippets are strictly excluded.

## Content Security Policy (CSP)

`website/scripts/generate-headers.mjs` shares the exact canonical predicate `validateGA4Config`:
- **Default build**: `connect-src 'self'`.
- **Approved collection build** (illustrative addition to existing `'self'` and generated inline hashes; never drops generated hashes or adds `'unsafe-inline'`):
  - `script-src`: adds exact token `https://www.googletagmanager.com/gtag/js`
  - `connect-src 'self' https://www.google-analytics.com/g/collect https://region1.google-analytics.com/g/collect`
Only the exact reviewed Google Analytics script token and collection endpoints are allowlisted; no wildcard Google domain exemptions or `'unsafe-inline'` permissions are permitted.
## Transport failure isolation & terminal script error

Network or transport failures (e.g. ad-blocker blocking, offline status, script loading errors, or Google endpoint downtime) are caught silently. A Google tag script load error fails closed terminally until page reload (no automatic retries or re-activation). Telemetry errors **never** interrupt video playback, clipboard actions, navigation, or accessible recovery.
