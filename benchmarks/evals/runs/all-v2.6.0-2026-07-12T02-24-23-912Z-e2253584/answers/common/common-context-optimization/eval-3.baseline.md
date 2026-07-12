Growing context can increase latency, but cache misses are only one possible cause, so measure both input-token volume and the provider's cache-read/cache-write metrics. First reduce the amount of dynamic material sent on every request: summarize old turns, remove duplicate tool output, filter logs, limit retrieved documents, and request targeted or paginated results.

For prompt caching, keep the long, reusable prefix stable and place changing content at the end. The stable prefix should contain versioned system instructions, tool definitions, and canonical reference material. Avoid inserting timestamps, random IDs, per-request status, or newly retrieved text into that prefix, and serialize equivalent content deterministically. Reuse the same model, compatible parameters, and cache settings where the provider requires them. Cache static reference data separately when possible and pass a compact pointer or selected excerpt rather than re-sending the entire corpus.

A practical sequence is:

1. Measure baseline latency, input tokens, output tokens, time-to-first-token, and cache hit/read tokens.
2. Add hard limits and summaries to tool and retrieval outputs.
3. Maintain a rolling conversation summary and send only recent turns plus the stable goal/state.
4. Reorder the request so stable content precedes volatile user/tool data.
5. Compare cache-hit rate and end-to-end latency under repeated, otherwise identical requests.

If latency remains high after the prompt is bounded and the prefix is stable, investigate output generation, rate limits, queueing, network time, model choice, and provider cache TTL or minimum-prefix rules. Prompt caching is an optimization rather than a correctness guarantee, so the application should remain correct on a cache miss.

