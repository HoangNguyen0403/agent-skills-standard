# Plausible collection contract — implementation approved, collection not activated

## Status and authority

The owner selected Plausible custom events in PR 263 and explicitly approved this disclosed provider-specific contract for implementation, including explicit opt-in/default-off behavior and the processing, retention and deletion limitations below. This approval does not authorize account registration, purchase, event transmission, production deployment or participant-data collection. The owner selected an existing authorized test site, but its non-secret identifier and approved constant HTTPS test URL have not been supplied. Default and preview collection remain disabled. T08 is not complete until implementation, bounded real-provider verification and owner acceptance are established; local intercepted requests do not prove provider receipt.

## Application events and transport

Preserve SRS-009's closed application fields: `schema_version`, `event_name`, registered-or-unknown `campaign_id`, associated registered-or-unknown `asset_id`, and build-time-allowlisted `placement`. Names are `demo_play`, `setup_guide_open`, `install_command_copy`, `github_click`.

Use direct browser POST to `https://plausible.io/api/event`, without the tracker SDK, automatic pageviews, link listeners, proxy or new backend. Map `event_name` to required provider `name`; `props` contains only the other four application fields. Provider `domain` is an owner-approved site identifier. Required `url` is an owner-approved constant HTTPS origin/path, never the current URL, query, fragment or clicked destination. Omit JSON referrer, revenue, identity and other properties. No configurable provider endpoint is approved.

Required request options: JSON body, `Content-Type: text/plain`, `credentials: omit`, `referrerPolicy: no-referrer`; no custom User-Agent, forwarded-IP or debug header. Cross-origin Origin and ordinary browser/network metadata still exist. Browser/CORS/provider receipt remain unverified. Valid explicitly configured collection artifacts may allow only `https://plausible.io/api/event` in `connect-src`; default, invalid and unconfigured builds retain self-only connection policy. Ordinary preview builds remain unconfigured and off. Header generation and client configuration must use the same validation contract.

## Unavoidable provider processing — disclosed in implementation approval

The application must create no visitor identifier. Nevertheless, Plausible processes source IP/User-Agent and derives a daily visitor hash from salt + site domain + IP + User-Agent. It derives device/browser/OS and approximate geographic information and stores event/session records. An aggregate dashboard is not aggregate-only storage. Vendor statements say raw visitor IP/User-Agent are not persisted and the daily salt is deleted every 24 hours; this is not a claim of no IP processing or 24-hour event retention.

Visitor-data hosting is described as EU/Germany with documented visitor subprocessors. Account, billing and support processing must be reviewed separately; do not describe every account datum as EU-only. These vendor commitments are not an independent legal-compliance determination.

## Consent, withdrawal and deletion contract

Require explicit opt-in before collection, with in-memory consent only and a new opt-in after a page reload; no browser-storage persistence. Disabled/unconfigured/absent/withdrawn consent sends zero events. Withdrawal stops future sends, including completion of an earlier asynchronous action, without blocking navigation, clipboard or playback. No persistent event queue, pre-consent replay or automatic retry. No contacts, participant identifiers, raw URLs/query/referrers, clipboard contents, private code or filesystem paths in events.

Owner must approve notice wording, processing purpose, controller/contact, lawful policy and handling of requests. Provider Business pricing advertises five-year retention; salt lifetime is not retention. Site reset deletes all statistics, while individual custom-property values cannot be selectively deleted. Do not promise per-participant historical erasure. Accidental identifying data requires owner escalation and potentially whole-site reset. Provider security describes encrypted daily EU backups retained 30 days; logical deletion is not immediate erasure of every backup, and that statement is not a verified deletion-completion SLA.

Consented pilot cohorts/contact records remain a separate private-storage contract under SRS-010. Analytics opt-in does not authorize cohort import, identity linkage or disclosure of participant information.

## Event correctness and failure behavior

- Send `demo_play` only after successful user-initiated playback, once per media instance/page lifecycle; never on render, failed play or every resume. After actual Chromium verification showed that native play-button pointer events are not observable at authored DOM capture roots, the owner explicitly selected **“Explicit start, then native controls.”** In a configured collection build with JavaScript, an accessible first-start button initiates playback; native controls become available afterward. Default unconfigured builds and no-JavaScript rendering retain the native player. Bind eligibility to consent at the initiating action and recheck it on successful playback; do not replay a pre-consent or withdrawn action.
- Send `install_command_copy` only after actual non-stale clipboard success; failed/manual-copy recovery is not a successful-copy event.
- Give each action one classification; do not double-count via overlapping click handlers.
- Validate campaign/asset association; unknown input becomes `unknown`, not arbitrary query text.
- Transport failure never delays or prevents the primary action. Preserve keyboard, no-JavaScript, responsive and media/caption guarantees.

## Account, plan and bounded test gate

Official pricing read for this proposal displays Business at $19/month for 10k monthly team volume; custom properties require Business. This is not a binding tax-inclusive quote or purchase authorization. A documented 30-day no-card trial offers Business features but still requires an authorized account and terms/DPA acceptance. Pageviews plus custom events consume team volume. A locked dashboard does not imply collection stopped.

The owner explicitly selected **“Keep live collection blocked”**: include the default-off implementation and local intercepted proof in PR #263, without transmitting provider events. A later provider test requires approved account/site ownership, a non-secret test identifier and fixed HTTPS URL, privacy/consent terms, operator browser/source, cash/event/time caps and expiry/stop owner. The earlier selection of an existing test site does not supply those missing values or authorize transmission. No credentials belong in this repository or public evidence.

Configure the four event goals and approved property names before sending. Verify actual dashboard goal/property receipt for known actions; HTTP 202 alone is insufficient because dropped events can also return 202. Record rejection/drop behavior without sensitive debug headers or raw IP/User-Agent evidence. Localhost/staging may be dropped; do not invent a direct-API `captureOnLocalhost` field or claim a local sink proves provider receipt.

## Acceptance evidence required

Contract/privacy approval; default-off and opt-in/withdrawal browser proof; successful playback and clipboard event semantics; payload and network metadata inspection; unavailable transport behavior; exact CSP; real provider receipt/drop classification; account/plan/cap evidence; owner acceptance. Missing account or provider receipt leaves T08 open, not passed by mocks. Public export contains bounded redacted evidence only.

## Official sources

- [Events API](https://plausible.io/docs/events-api), [custom events](https://plausible.io/docs/custom-event-goals), [tracker options](https://plausible.io/docs/script-extensions).
- [Visitor data policy](https://plausible.io/data-policy), [DPA](https://plausible.io/dpa), [security and backups](https://plausible.io/security), [EU hosting](https://plausible.io/eu-hosted-web-analytics), [account privacy](https://plausible.io/privacy), [terms](https://plausible.io/terms).
- [Custom properties and deletion limitations](https://plausible.io/docs/custom-props/introduction), [site reset](https://plausible.io/docs/reset-site-data), [property dashboard](https://plausible.io/docs/custom-props/props-dashboard).
- [Pricing](https://plausible.io/#pricing), [subscription/trial](https://plausible.io/docs/subscription-plans), [site registration](https://plausible.io/docs/add-website).
