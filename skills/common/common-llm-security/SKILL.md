---
name: common-llm-security
description: OWASP LLM Top 10 (2025) audit checklist for AI applications, agent tools, RAG pipelines, and prompt construction. Use when performing any security review touching LLM client code, prompt templates, agent tools, or vector stores.
metadata:
  triggers:
    keywords:
    - LLM security
    - prompt injection
    - agent security
    - RAG security
    - AI security
    - openai
    - anthropic
    - langchain
    - LLM review
---
# OWASP LLM Top 10 Security Checklist (2025)

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

- **Check LLM01 first**: Prompt injection #1 LLM finding — any user input concatenated directly into prompt string immediate P0.
- **Check LLM06 next**: Agent tools with write/delete/execute capabilities without confirmation P0.
- **Mark each item**: ✅ not affected | ⚠️ needs review | 🔴 confirmed finding.
- **P0 finding caps Security score at 40/100** — not skip any item.
- See [references/owasp-llm.md](references/owasp-llm.md) for full detection signals.

## OWASP LLM Top 10 (2025)

| ID | Risk | Key Detection Signal |
| ----- | ---- | -------------------- |
| LLM01 | Prompt Injection | User input string-concatenated into prompt. Retrieved docs inserted into system turn. |
| LLM02 | Sensitive Information Disclosure | PII or credentials passed into prompt context. LLM response logged without redaction. |
| LLM03 | Supply Chain | Unverified model weights or plugins. Third-party agent added without trust review. |
| LLM04 | Data & Model Poisoning | User-controlled data written to training sets or embedding stores without validation. |
| LLM05 | Improper Output Handling | LLM output used directly in DOM sink, SQL query, shell command, or redirect URL. |
| LLM06 | Excessive Agency | Agent tool with write/delete/network access — no human-in--loop confirmation. |
| LLM07 | System Prompt Leakage | System prompt content returned via tool output, error message, or API response. |
| LLM08 | Vector & Embedding Weaknesses | User text injected into vector store without sanitization. No tenant namespace isolation. |
| LLM09 | Misinformation | LLM output used for critical decisions (medical, financial, legal) without verification. |
| LLM10 | Unbounded Consumption | No `max_tokens` on LLM call. No rate limit on invocations. Agent loop without depth cap. |

## Anti-Patterns

- **No prompt concat**: Pass user input as separate `user` turn, never interpolated into system prompts.
- **No raw LLM output in sinks**: Sanitize LLM responses before writing to DOM, queries, or shell.
- **No uncapped agent loops**: Every agentic recursion must enforce max iteration/depth limit.

## References

- [OWASP LLM — Full Detection Signals](references/owasp-llm.md) — load when auditing any LLM client code