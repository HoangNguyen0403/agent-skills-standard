# Playwright MCP Authoring — Confirming Locators Before Writing the Page Object

Use the browser only to **confirm** locators the plan needs, never to discover what to test.

Session discipline follows `quality-engineering-playwright-cli`: named session, aria-first, mandatory close.

```bash
playwright-cli -s=pom-checkout open http://localhost:3000/checkout
playwright-cli -s=pom-checkout snapshot --aria
# read the aria tree: find role/name for each plan element
playwright-cli -s=pom-checkout close
```

Decision per element from the aria snapshot:

| Aria shows | Write |
| --- | --- |
| `button "Place Order"` with stable accessible name | `getByRole('button', { name: 'Place Order' })` unless the name is a translated string, then testid |
| `textbox "Email"` | `getByLabel('Email')` |
| generic node, no name, has `data-testid` | `getByTestId('<screen>-<element>-<role>')` |
| generic node, no name, no testid | selector gap: emit `<screen>-<element>-<role>` for `specialist-testid-inserter` |

Never copy a CSS path or XPath out of the snapshot into a page object.

When the vendor Playwright agents are present (`npx playwright init-agents`), their generator may propose page objects; run this skill's Anti-Patterns over the proposal before accepting (assertions inside page objects and `nth` locators are the two most common vendor outputs to reject).
