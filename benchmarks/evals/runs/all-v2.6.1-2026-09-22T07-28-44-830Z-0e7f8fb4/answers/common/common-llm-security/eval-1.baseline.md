The code has a prompt-injection vulnerability: concatenating the user’s message into the system prompt lets user-controlled text alter or override system instructions.

Potential impact:

- Bypass safety and business rules
- Reveal system prompts or confidential context
- Manipulate tool calls or external actions
- Change output format or impersonate trusted instructions

Fix by keeping the system prompt static and passing the user message through the dedicated user-message field:

```ts
const messages = [
  { role: "system", content: SYSTEM_PROMPT },
  { role: "user", content: userMessage },
];
```

Treat user input as untrusted data. Do not attempt to secure this by escaping or concatenating delimiters; enforce authorization and tool permissions independently of model instructions. Assume `userMessage` may contain arbitrary prompt-injection text.
