Before writing test cases, analyze these impacts:

- **Scope and rule:** Confirm the exact condition: `market = VN` shows the invoice download button; every other market hides it. Clarify whether this is based on account market, order market, billing address, or current user profile.
- **Positive/negative coverage:** Test `VN` and representative non-VN markets. Include missing, invalid, lowercase/mixed-case, and changed market values.
- **UI states:** Check the button on every affected invoice/order screen, including invoice available, unavailable, pending, cancelled, and multiple-invoice states.
- **User and role impact:** Verify whether the rule applies to all roles or only specific customers/admins, and whether permissions independently control download access.
- **Navigation/state changes:** Check changing market, switching accounts, refresh, logout/login, deep links, and cached pages to ensure the button does not remain visible incorrectly.
- **Functional/API security:** Confirm the download endpoint enforces the same market restriction server-side. A hidden button must not mean that non-VN users can still download through a direct URL or API call.
- **Platform and presentation:** Check web/mobile/responsive layouts, localization, accessibility, and keyboard/screen-reader behavior.
- **Regression impact:** Identify existing invoice display, download, authorization, market-selection, and order-history flows that could be affected.
- **Test data and traceability:** Prepare accounts/orders for `VN`, non-VN, missing/invalid market, and each relevant invoice status; map each scenario to the story’s acceptance criteria.

The key risk is testing only button visibility while missing unauthorized downloads through direct navigation or API access.
