# User Story Authoring Template

## Story Header

**As a** `[Actor — be specific: {APP_NAME} Customer / VN Sales Rep / Admin]`,
**I want** `[Goal — one clear action]`,
**so that** `[Business Value — why it matters]`.

---

## In Scope

> List the pages, flows, or platforms explicitly covered by this story.

- `[BOTH]` Homepage — product card price display
- `[MOBILE]` Boosted products section
- `[WEB]` Product catalog and sub-pages

## Out of Scope

> List anything explicitly excluded to prevent scope creep.

- Product Detail Page with Tender Contract (separate story)
- Combo Detail Page

## Deferred

> Items not covered now but tracked. Each item MUST link to a Jira ticket.

- Translation / locale behavior → [TICK-42955](https://your-jira-url/browse/TICK-42955)

---

## Acceptance Criteria

> One `Given / When / Then` block per AC. One condition per block. Tag every AC with platform and toggle state.

### AC 1 — [Short Label]

```
Toggle: DisplayItemTaxBreakdown = ON
Platform: [BOTH]
Actor: Customer

Given  the user is an Customer with DisplayItemTaxBreakdown = ON
When   the user views a product card on the Homepage
Then   the product card shows:
         - Price After Tax (highlighted, strikethrough if list price > offer price)
         - Price Before Tax
         - Tax amount
       AND the font size/weight follows the agreed design spec
```

### AC 2 — [Short Label]

```
Toggle: DisplayItemTaxBreakdown = OFF
Platform: [BOTH]
Actor: Customer

Given  the user is an Customer with DisplayItemTaxBreakdown = OFF
When   the user views a product card on any page
Then   the product card shows the price highlighted (style update only)
       AND the product UI structure is unchanged
```

### AC 3 — [Market: VN] Tender Contract Tag

```
Toggle: N/A
Platform: [BOTH]
Market: VN
Actor: VN Customer

Given  the user is a VN Customer
  AND  a Tender Contract product is available in the product catalog
When   the user views the product card
Then   the product card shows a "Tender available" tag with icon
  AND  if the product has a mandatory tender contract, the CTA reads "Buy with tender"
```

---

## Actor / Platform Matrix

| AC   | Actor        | Platform | Toggle                      | Market |
| ---- | ------------ | -------- | --------------------------- | ------ |
| AC 1 | Customer     | BOTH     | DisplayItemTaxBreakdown=ON  | All    |
| AC 2 | Customer     | BOTH     | DisplayItemTaxBreakdown=OFF | All    |
| AC 3 | VN Customer  | BOTH     | N/A                         | VN     |

---

## Open Questions / Blockers

> Flag unresolved gaps here. Do NOT write "to discuss" inline in AC — move it here with an owner.

| #   | Question                                   | Owner   | Jira                                                                |
| --- | ------------------------------------------ | ------- | ------------------------------------------------------------------- |
| 1   | Does translation AC need a separate story? | BA Lead | [TICK-42955](https://your-jira-url/browse/TICK-42955) |
