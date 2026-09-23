Guardrail violated: do not use an unvalidated broadening of scope; OR-ing events can create false positives and does not guarantee complete coverage.

Stop and verify the event semantics before proceeding. Restart only after each event is independently mapped and tested.

Evidence required: precise event definitions, an OR truth table, edge-case tests, and coverage/log evidence showing all five events are detected without unintended matches.
