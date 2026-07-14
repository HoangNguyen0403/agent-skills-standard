# Security audit: direct user input in the system prompt

## Verdict

🔴 **LLM01 Prompt Injection (P0, confirmed).** Concatenating the user's message into the system prompt removes the trust boundary between developer-controlled instructions and untrusted data. A user can append instructions that override the chatbot's intended behavior, reveal hidden instructions, or influence downstream actions. Under this checklist, a confirmed P0 finding caps the security score at 40/100.

## Required fix

Keep the system message static and pass the message as a separate `user`-role message. Delimit any untrusted content explicitly, and do not treat the model's response as trusted merely because the system prompt is protected. Example shape:

```text
system: <fixed policy and capabilities>
user: <user message>
```

Also apply output validation before any UI, database, shell, URL, or tool sink. Add tests showing that instruction-like user text cannot change system policy or disclose the system prompt.

## OWASP LLM Top 10 status

- LLM01 Prompt Injection: 🔴 confirmed — direct interpolation into the system prompt.
- LLM02 Sensitive Information Disclosure: ⚠️ needs review — inspect prompt context, logs, and retained history for PII, credentials, and unredacted responses.
- LLM03 Supply Chain: ⚠️ needs review — verify model, SDK, and plugin provenance, versions, and integrity checks.
- LLM04 Data & Model Poisoning: ⚠️ needs review — determine whether user content feeds training or embedding stores without validation.
- LLM05 Improper Output Handling: ⚠️ needs review — audit every consumer of the chatbot response and enforce escaping, parameterization, and schema validation.
- LLM06 Excessive Agency: ⚠️ needs review — confirm whether the chatbot can invoke write, delete, network, or execution tools and whether approval is required.
- LLM07 System Prompt Leakage: ⚠️ needs review — prevent prompt content from appearing in responses, errors, debug fields, or tool output.
- LLM08 Vector & Embedding Weaknesses: ⚠️ needs review — check ingestion validation and tenant isolation if retrieval is used.
- LLM09 Misinformation: ⚠️ needs review — add verification and human gates for medical, legal, financial, or other high-impact answers.
- LLM10 Unbounded Consumption: ⚠️ needs review — enforce `max_tokens`, rate limits, budget alerts, and agent depth limits where applicable.

