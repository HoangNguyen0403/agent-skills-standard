## Audit result

**🔴 Confirmed P0: LLM01 — Prompt Injection**

Concatenating the user’s message directly into the system prompt allows the user to alter or override system instructions. Per the checklist, this is an immediate P0 finding and caps the security score at **40/100**.

### OWASP LLM Top 10 assessment

- **LLM01 — Prompt Injection:** 🔴 Confirmed. User input is concatenated into the system prompt.
- **LLM02 — Sensitive Information Disclosure:** ⚠️ Needs review. Check whether PII, credentials, secrets, or unredacted responses enter prompts or logs.
- **LLM03 — Supply Chain:** ⚠️ Needs review. Verify model weights, plugins, dependencies, pinned source revisions, and hashes.
- **LLM04 — Data & Model Poisoning:** ⚠️ Needs review. Validate and sanitize user-controlled data before writing it to training data or embedding stores.
- **LLM05 — Improper Output Handling:** ⚠️ Needs review. Do not send raw LLM output directly to the DOM, SQL, shell, or redirect URLs.
- **LLM06 — Excessive Agency:** ⚠️ Needs review. Confirm that write, delete, execute, and network-capable tools require human confirmation.
- **LLM07 — System Prompt Leakage:** ⚠️ Needs review. Prevent system prompts from being exposed through tool output, errors, or API responses.
- **LLM08 — Vector & Embedding Weaknesses:** ⚠️ Needs review. Ensure sanitization and tenant namespace isolation for vector-store data.
- **LLM09 — Misinformation:** ⚠️ Needs review. Verify outputs before using them for medical, financial, legal, or other critical decisions.
- **LLM10 — Unbounded Consumption:** ⚠️ Needs review. Configure `max_tokens`, rate-limit invocations, and cap agent loop depth or iterations.

## Remediation

Keep the system prompt static and pass the user message as a separate `user` turn:

```js
const messages = [
  {
    role: "system",
    content: STATIC_SYSTEM_PROMPT,
  },
  {
    role: "user",
    content: userMessage,
  },
];

const response = await openai.chat.completions.create({
  model: "your-approved-model",
  messages,
  max_tokens: 512,
});
```

Do not interpolate `userMessage` into `STATIC_SYSTEM_PROMPT`. Validate and sanitize user input as defense in depth, but do not treat sanitization as a replacement for message-role separation. Also sanitize and validate model output before sending it to any DOM, SQL, shell, redirect, persistence, or tool-execution sink.
