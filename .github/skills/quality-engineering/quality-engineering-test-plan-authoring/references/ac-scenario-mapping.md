# AC to Scenario Mapping

One AC condition = one scenario. An AC with multiple conditions
("shows an error AND does not submit") becomes two scenarios, each with its
own `Expected`. Never collapse a negative-path condition into the same
scenario as the happy path — they need independent pass/fail evidence.

Traceability: `traceability-audit` reads the `@AC-n` tag directly from the
scenario block, so it must match the AC id in the PRD/SRS exactly, including
case.
