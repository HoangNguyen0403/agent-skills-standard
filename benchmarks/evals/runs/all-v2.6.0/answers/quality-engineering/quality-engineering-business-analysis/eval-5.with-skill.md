Not ready for development: the story has an unclear Actor, undefined price-change logic, buried platform scope, and “to discuss” translation behavior.

### Revised story

**As a Customer, I want to see when an offer’s price changes, so that I can notice the updated price before purchasing.**

### Variables requiring definition

- `previousPrice`
- `currentPrice`
- `priceChanged`
- `userLanguagePreference`
- Currency and rounding rules
- Offer states: active, unavailable, expired

### Acceptance criteria

**AC1 — `[MOBILE]` Price change is highlighted**

Given the Customer is viewing an active offer on Mobile,  
When `currentPrice` differs from `previousPrice`,  
Then the current price is visibly highlighted.

**AC2 — `[MOBILE]` No price change**

Given the Customer is viewing an active offer on Mobile,  
When `currentPrice` equals `previousPrice`,  
Then the price is displayed without the price-change highlight.

**AC3 — `[MOBILE]` Price display**

Given the offer has a valid `currentPrice`,  
When the offer page loads,  
Then the current price is displayed with its applicable currency and formatting.

**AC4 — `[MOBILE]` Translation**

Given the Customer has a supported `userLanguagePreference`,  
When the offer page loads,  
Then price-related labels are displayed in that preferred language.

### Truth table

| Platform | `priceChanged` | Expected result |
|---|---:|---|
| Mobile | True | Highlight `currentPrice` |
| Mobile | False | Do not highlight price |
| Web | True/False | Undefined; explicitly mark out of scope or specify behavior |

### Scope

**In Scope**

- Mobile offer page
- Detecting and displaying a changed `currentPrice`
- Highlighting the changed price
- Defined currency and locale formatting

**Out of Scope**

- Web behavior, unless separately specified
- Price-history display
- Notification of price changes outside the offer page

**Deferred**

- Translation fallback and unsupported-language behavior must be defined in a linked Jira ticket; no ticket ID was provided. Replace the placeholder with the actual ticket link.
