Use a `dataclass` for an owned, structured result that has a stable shape, useful defaults, or invariants/behavior. It gives callers an explicit Python type and can be made immutable with options such as `frozen=True`.

Use a `TypedDict` when the contract is intentionally dict-shaped, especially for JSON-like data crossing a boundary. It improves static checking but does not validate or construct the data at runtime. A raw `dict` is appropriate only when the shape is genuinely dynamic, unknown, or temporary. Validate untrusted input at the boundary before treating it as a typed contract.
