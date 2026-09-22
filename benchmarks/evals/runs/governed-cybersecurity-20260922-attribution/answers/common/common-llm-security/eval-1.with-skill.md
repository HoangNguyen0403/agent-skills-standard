## Audit result

**🔴 LLM01 — Prompt Injection: Confirmed, P0**

Concatenating the user’s message into the system prompt allows the user to alter or override system instructions. This is a direct prompt-injection vulnerability and caps the security score at **40/100**.

Remediate by keeping the system prompt static and passing user input as a separate `user` message:

```js
const messages = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: userMessage }
];

const response = await client.chat.completions.create({
  model: "your-model",
  messages,
  max_tokens: 1000
});
```

Also validate and **sanitize** user input where appropriate, delimit untrusted retrieved content, and never treat user-controlled text as instructions.

## OWASP LLM Top 10 status

- **LLM01 Prompt Injection:** 🔴 Confirmed — direct prompt concatenation.
- **LLM02 Sensitive Information Disclosure:** ⚠️ Needs review — check whether PII, credentials, system prompts, or unredacted responses enter the prompt or logs.
- **LLM03 Supply Chain:** ⚠️ Needs review — verify model, packages, plugins, weights, pinned revisions, and hashes.
- **LLM04 Data & Model Poisoning:** ⚠️ Needs review — validate user-controlled data before storing it in training data, memory, or embedding stores.
- **LLM05 Improper Output Handling:** ⚠️ Needs review — sanitize model output before using it in the DOM, SQL, shell commands, or redirect URLs.
- **LLM06 Excessive Agency:** ⚠️ Needs review — require human confirmation for tools that write, delete, execute, or access networks.
- **LLM07 System Prompt Leakage:** ⚠️ Needs review — prevent prompt contents from appearing in tool output, errors, or API responses.
- **LLM08 Vector & Embedding Weaknesses:** ⚠️ Needs review — sanitize indexed text and enforce tenant namespace isolation.
- **LLM09 Misinformation:** ⚠️ Needs review — independently verify outputs used for medical, financial, legal, or other critical decisions.
- **LLM10 Unbounded Consumption:** ⚠️ Needs review — set `max_tokens`, rate-limit requests, and cap agent loop depth or iterations.

The immediate release blocker is the confirmed **LLM01** issue.
