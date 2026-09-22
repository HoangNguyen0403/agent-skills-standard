# Synthetic component view evidence

The fixture demonstrates a proposed design, not a deployed system.

- Question: Which modules own order writes and retry handling?
- Invariant: An order is charged at most once.

Proposed ownership: Order Service contains Order API and Retry Policy. Retry Policy records each business-operation outcome in Orders Database. The synthetic Python files illustrate outcome routing only; they do not call a payment provider or persist records.
