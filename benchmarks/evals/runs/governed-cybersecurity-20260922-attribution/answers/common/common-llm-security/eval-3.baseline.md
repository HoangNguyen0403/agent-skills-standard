The pipeline is vulnerable to indirect prompt injection: retrieved document chunks are untrusted input and may contain instructions that override the system prompt or manipulate tool use.

Mitigate by:

- Treating retrieved content strictly as data, never as instructions.
- Separating system/developer instructions from user queries and document context.
- Sanitizing and structurally delimiting chunks, e.g. `<retrieved_context>…</retrieved_context>`.
- Applying input/output validation and content filtering.
- Restricting tools and requiring authorization for consequential actions.
- Logging suspicious retrievals and testing with adversarial documents.
- Using least-privilege permissions and an explicit instruction hierarchy in the prompt.
