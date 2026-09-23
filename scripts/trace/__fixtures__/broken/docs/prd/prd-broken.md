# PRD: Broken Checkout

## 4. Requirement Registry

| Req ID | Requirement | Persona | Priority | Owner | Status | BRD Objective Ref |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Retry payment | Shopper | P0 | eng | Approved | BRD-OBJ-001 |
| REQ-001 | Duplicate row of REQ-001 | Shopper | P0 | eng | Approved | BRD-OBJ-001 |
| REQ-002 | Requirement with no BRD link | Shopper | P1 | eng | Draft | TBD |
| REQ-003 | Requirement nothing ever cites again | Shopper | P2 | eng | Draft | BRD-OBJ-001 |
| REQ-1 | Malformed requirement id | Shopper | P2 | eng | Draft | BRD-OBJ-001 |

## 5. User Stories And ACs

| AC ID | Linked Req | Scenario | Given | When | Then | Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | happy path | cart ready | payment fails once | retries and succeeds | Approved |
| AC-002 | REQ-002 | no downstream SRS ever cites this AC | cart ready | payment fails | retries | Approved |
| AC-01 | REQ-001 | malformed AC id | cart ready | payment fails | retries | Draft |
