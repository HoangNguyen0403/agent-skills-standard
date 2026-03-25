# User Story Authoring Template

## Story Header

**As a** `[Actor — be specific: EZ Rx Customer / VN Sales Rep / Admin]`,
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

- Translation / locale behavior → [EZRX-42955](https://zuelligpharma.atlassian.net/browse/EZRX-42955)

---

## Acceptance Criteria

> One `Given / When / Then` block per AC. One condition per block. Tag every AC with platform and toggle state.

### AC 1 — [Short Label]

```
Toggle: DisplayItemTaxBreakdown = ON
Platform: [BOTH]
Actor: EZ Rx Customer

Given  the user is an EZ Rx Customer with DisplayItemTaxBreakdown = ON
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
Actor: EZ Rx Customer

Given  the user is an EZ Rx Customer with DisplayItemTaxBreakdown = OFF
When   the user views a product card on any EZ Rx page
Then   the product card shows the price highlighted (style update only)
       AND the product UI structure is unchanged
```

### AC 3 — [Market: VN] Tender Contract Tag

```
Toggle: N/A
Platform: [BOTH]
Market: VN
Actor: VN EZ Rx Customer

Given  the user is a VN EZ Rx Customer
  AND  a Tender Contract product is available in the product catalog
When   the user views the product card
Then   the product card shows a "Tender available" tag with icon
  AND  if the product has a mandatory tender contract, the CTA reads "Buy with tender"
```

---

## Actor / Platform Matrix

| AC   | Actor             | Platform | Toggle                      | Market |
| ---- | ----------------- | -------- | --------------------------- | ------ |
| AC 1 | EZ Rx Customer    | BOTH     | DisplayItemTaxBreakdown=ON  | All    |
| AC 2 | EZ Rx Customer    | BOTH     | DisplayItemTaxBreakdown=OFF | All    |
| AC 3 | VN EZ Rx Customer | BOTH     | N/A                         | VN     |

---

## Open Questions / Blockers

> Flag unresolved gaps here. Do NOT write "to discuss" inline in AC — move it here with an owner.

| #   | Question                                   | Owner   | Jira                                                                |
| --- | ------------------------------------------ | ------- | ------------------------------------------------------------------- |
| 1   | Does translation AC need a separate story? | BA Lead | [EZRX-42955](https://zuelligpharma.atlassian.net/browse/EZRX-42955) |
