Use a four-test TDD sequence for the order service, with one behavior per test and AAA structure in each case.

Recommended order:

1. Happy path first
   - Arrange: create a valid order request, stub dependencies that must succeed, and define the expected created order result.
   - Act: call the order service method once.
   - Assert: verify the returned order is created correctly and the expected side effects occur.

2. Error scenario: inventory unavailable
   - Arrange: valid request, but inventory dependency reports insufficient stock.
   - Act: call the service.
   - Assert: verify the service returns or throws the inventory failure outcome and does not continue to downstream side effects.

3. Error scenario: payment rejected
   - Arrange: inventory succeeds, payment dependency fails.
   - Act: call the service.
   - Assert: verify the payment failure is surfaced and no completion state is recorded.

4. Error scenario: invalid order input
   - Arrange: malformed or incomplete order request.
   - Act: call the service.
   - Assert: verify validation fails immediately with the correct error contract.

TDD enforcement details:

- Start with only the happy-path failing test and prove it fails before writing implementation code.
- Write the smallest code needed to pass that test.
- Add the next failing error-path test only after the suite is green.
- Mock external boundaries such as payment gateways, HTTP clients, clocks, and filesystem access.
- Do not mock pure domain rules unnecessarily.

This preserves Red-Green-Refactor discipline while producing coverage for one success path and three distinct failure contracts.

