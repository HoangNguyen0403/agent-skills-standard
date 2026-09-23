Critical vulnerability: prompt injection via direct concatenation of untrusted user input into the system prompt.

Assumption: the chatbot treats the resulting concatenated string as a trusted system instruction. An attacker can append instructions such as “ignore previous rules,” alter behavior, extract hidden context, or trigger unauthorized tool actions.

Recommended fix:

- Keep the system prompt static and send the user message as a separate user-role message.
- Never interpolate user content into system/developer instructions.
- Apply server-side authorization and tool validation independently of model output.
- Use delimiters only as defense-in-depth; they do not prevent injection.
- Add tests for instruction override, secret extraction, tool misuse, and delimiter-breaking input.
- Avoid placing secrets in prompts; redact sensitive data from logs.

Safer structure:

```js
const messages = [
  { role: "system", content: STATIC_SYSTEM_PROMPT },
  { role: "user", content: userMessage }
];
```

Severity: High if the chatbot has access to confidential data, tools, or external side effects; otherwise Medium due to behavior manipulation and possible data disclosure.
