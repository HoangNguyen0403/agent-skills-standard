This is an indirect prompt-injection vulnerability: retrieved chunks are untrusted input but are treated as prompt instructions.

Mitigate by:

- Marking retrieved content explicitly as untrusted data.
- Wrapping chunks in strict delimiters and instructing the model not to follow their instructions.
- Validating, filtering, and size-limiting chunks before prompt construction.
- Applying output validation and permission checks before executing model-generated actions.
- Preserving source provenance so suspicious content can be traced and excluded.

Assumption: retrieved documents may be user-controlled or externally sourced.
