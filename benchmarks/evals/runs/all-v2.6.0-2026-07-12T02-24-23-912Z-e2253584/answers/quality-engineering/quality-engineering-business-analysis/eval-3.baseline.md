Before writing tests, perform impact analysis across:

- Actors and authorization: identify who may download an invoice and whether “Market VN” is determined by account, delivery address, or order.
- Scope: confirm Web/Mobile, supported screens, order states, and whether the rule applies to historical orders.
- UI: identify the button/tag placement, hidden versus disabled behavior outside VN, loading state, empty/error state, and localization.
- Data/API: identify the market field, invoice availability contract, download endpoint, permissions, file type, naming, and error handling.
- Integrations: check analytics, feature flags, backend services, document generation, and security/privacy controls.
- Regression: map affected existing stories and test cases for VN, non-VN, roles, platforms, and invoice states.

Record the dependency and risk findings, then convert the rule into atomic acceptance criteria before creating test cases.
