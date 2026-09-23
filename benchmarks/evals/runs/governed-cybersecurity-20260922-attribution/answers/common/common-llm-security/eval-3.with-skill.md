This is a confirmed **LLM01 Prompt Injection** finding and should be treated as **P0**. Retrieved document chunks are untrusted input; malicious content can override instructions or influence tool calls and answers.

Assuming no additional controls were provided:

- **LLM01:** 🔴 Confirmed — retrieved text is injected without validation.
- **LLM02:** ⚠️ Needs review — check for PII, credentials, and unredacted prompt/response logs.
- **LLM03:** ⚠️ Needs review — verify model, plugin, and package provenance.
- **LLM04:** ⚠️ Needs review — validate data before writing it to embedding stores or training data.
- **LLM05:** ⚠️ Needs review — sanitize model output before DOM, SQL, shell, or redirect sinks.
- **LLM06:** ⚠️ Needs review — require confirmation for write, delete, execute, or network tools.
- **LLM07:** ⚠️ Needs review — prevent system-prompt leakage through responses and errors.
- **LLM08:** ⚠️ Needs review — enforce input validation, tenant namespace isolation, and document provenance.
- **LLM09:** ⚠️ Needs review — independently verify medical, financial, legal, or other critical answers.
- **LLM10:** ⚠️ Needs review — enforce `max_tokens`, rate limits, and agent iteration/depth caps.

Remediation:

```text
1. Treat every query and retrieved chunk as untrusted.
2. Validate and sanitize chunks before prompt construction:
   - enforce size and encoding limits
   - strip or quarantine active markup and control sequences
   - attach source, tenant, and trust metadata
   - reject unauthorized or low-integrity documents
3. Never interpolate user input or retrieved text into the system prompt.
4. Put the user query in a separate `user` turn.
5. Put retrieved content in a clearly delimited untrusted-context section:
   [BEGIN UNTRUSTED DOCUMENT]
   ...
   [END UNTRUSTED DOCUMENT]
6. Instruct the model to use documents only as evidence, never as instructions.
7. Prevent retrieved text from selecting or authorizing tools.
8. Sanitize and validate the model’s output before using it in downstream sinks.
9. Log retrieval and prompt decisions with sensitive-data redaction.
10. Add adversarial tests containing instructions such as “ignore previous instructions” and verify they cannot change system behavior.
```

The security score is capped at **40/100** until the confirmed LLM01 issue is remediated and independently verified.
