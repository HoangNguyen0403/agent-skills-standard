Do not keep the 2,000 lines of raw JSON in the active conversation. Preserve the complete response in an external artifact if it may be needed for audit or later investigation, but put only a compact, lossless-enough extraction into the context:

- Extract the relevant event types, timestamps, request/task IDs, status codes, error messages, and a few surrounding records for each failure.
- Filter or aggregate repetitive records, such as counts by event type, time range, and error code. Keep the first occurrence, last occurrence, and representative examples rather than every duplicate.
- Ask the tool for structured fields, pagination, a time/ID range, or a server-side summary on the next call instead of requesting another unbounded dump. Set an explicit maximum output size.
- Record what was observed, what it means, and what remains uncertain in a short checkpoint. Do not replace exact identifiers or error text with vague prose when those values are needed to reproduce the issue.

Then compact the conversation: summarize the original goal, constraints, decisions, verified facts, open questions, and next action; remove or archive superseded reasoning and large intermediate outputs. Continue from that checkpoint. This reduces attention and serialization cost while retaining the evidence needed to make a correct decision. If the logs contain secrets or personal data, redact them before storing or summarizing them.

