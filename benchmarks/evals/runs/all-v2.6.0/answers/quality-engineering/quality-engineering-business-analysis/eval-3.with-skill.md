Before writing test cases, perform this impact analysis:

- Confirm the rule: invoice download button is visible/enabled only for `Market: VN`; `MY` and `SG` must not show it.
- Identify the `Actor` and permissions: customer, sales representative, admin, or other roles. Verify whether access differs by role.
- Identify the market `Variable`: user profile market, invoice/order market, account configuration, or feature-flag configuration. Test mismatches between these values.
- Check platform parity: verify behavior on `WEB`, `Mobile`, or `[BOTH]`; do not assume the same implementation or visibility rules.
- Identify feature toggles: document the flag name and expected behavior for both `Toggle: <FlagName> = ON` and `OFF`.
- Map the invoice lifecycle: invoice available, pending, failed, cancelled, missing, already downloaded, and unauthorized invoice. Determine whether the button is hidden, disabled, or shown with an error.
- Check backend/API impact: confirm whether non-VN users are also blocked server-side, not merely prevented from seeing the button.
- Analyze locale and translation separately: VN language/locale, English, and other supported locales must not change the market rule or produce missing labels.
- Cover state and network behavior: loading, offline, timeout, API error, and session expiry.
- Build a Truth table for at least:

| Market | Invoice downloadable | Expected button |
|---|---:|---|
| VN | Yes | Visible and enabled |
| VN | No | Defined explicitly: hidden, disabled, or unavailable state |
| MY | Yes | Hidden/blocked |
| SG | Yes | Hidden/blocked |
| Unknown/null | Any | Defined explicitly; do not assume VN |

Finally, record undefined behavior as analysis blockers and separate it into `In Scope`, `Out of Scope`, or `Deferred` with a Jira reference.
