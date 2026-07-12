Write the acceptance criterion with an explicit actor, market, platform, condition, and observable result:

“Given an authenticated {APP_NAME} user whose market is VN and whose order is eligible for tender, when the relevant order or offer is displayed, then the user sees a `Tender Available` tag.”

Add the complementary criteria implied by the rule:

- A non-VN user does not see the tag when all other conditions are the same.
- A VN user does not see the tag when the order is not eligible or tender is unavailable.
- The tag is absent while eligibility is loading and has defined behavior on API failure.
- The tag has the required localization, placement, accessibility name, and visual state.
- Market and eligibility are sourced from the agreed data fields, and direct access cannot expose another user’s tender information.

Confirm whether Web, Mobile, roles, order statuses, and historical orders are in scope.
