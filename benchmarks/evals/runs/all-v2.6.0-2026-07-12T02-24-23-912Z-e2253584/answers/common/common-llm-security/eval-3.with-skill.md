# Security audit: unvalidated RAG retrieval injected into the prompt

## Verdict

🔴 **LLM01 Prompt Injection (P0, confirmed).** Retrieved documents are untrusted external data. Injecting their chunks without validation creates an indirect prompt-injection path: a malicious document can contain instructions such as ignoring policy, exfiltrating context, or invoking tools. The pipeline also has a confirmed **LLM04 Data & Model Poisoning** concern when user-controlled text is admitted without validation, and an **LLM08 Vector & Embedding Weaknesses** concern unless namespace isolation and retrieval controls exist. A confirmed P0 finding caps the security score at 40/100.

## Required fix

Treat retrieved chunks as data, never as instructions. Preserve a clear role boundary: keep the system policy fixed, pass the user query as a user message, and place retrieved content in a separately delimited untrusted context section. Instruct the model to quote or use the context only as evidence and to ignore instructions contained within it. Validate and normalize documents at ingestion and retrieval, scan for malicious instruction patterns, enforce source authorization and tenant/namespace isolation, and attach source IDs for citation and auditing. Do not allow retrieved text to directly control tools, SQL, HTML, shell commands, or redirects; validate model output before every sink.

## OWASP LLM Top 10 status

- LLM01 Prompt Injection: 🔴 confirmed — unvalidated retrieved chunks cross the instruction/data boundary.
- LLM02 Sensitive Information Disclosure: ⚠️ needs review — check cross-tenant retrieval, PII in chunks, prompt context, and response/log retention.
- LLM03 Supply Chain: ⚠️ needs review — verify embedding model, vector database, loaders, parsers, and dependencies.
- LLM04 Data & Model Poisoning: 🔴 confirmed risk — user-controlled or untrusted text is accepted into the retrieval corpus without validation.
- LLM05 Improper Output Handling: ⚠️ needs review — enforce output schemas and safe sinks before acting on RAG-assisted responses.
- LLM06 Excessive Agency: ⚠️ needs review — ensure retrieval content cannot trigger write, delete, network, or execution tools without approval.
- LLM07 System Prompt Leakage: ⚠️ needs review — defend against chunks designed to elicit system instructions and suppress prompt/context disclosure.
- LLM08 Vector & Embedding Weaknesses: 🔴 confirmed risk — untrusted content enters retrieval without sanitization; verify tenant namespace isolation and adversarial-document handling.
- LLM09 Misinformation: ⚠️ needs review — require source attribution, freshness/relevance checks, and verification for high-impact answers.
- LLM10 Unbounded Consumption: ⚠️ needs review — cap query length, retrieved chunk count/context size, `max_tokens`, rate, spend, and any agent loop depth.

