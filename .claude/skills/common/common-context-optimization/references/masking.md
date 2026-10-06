# Output Filtering & Artifact Patterns

## Strategy: Filter at Source & Spill to Artifacts

Avoid loading hundreds of lines of raw tool output into context. Standard agent APIs are append-only; manage context at invocation time rather than assuming in-place history mutation.

### 1. The Pre-Ingestion Filter Pattern

Use targeted tools or proxies (`rtk`, line selectors, grep, jq) to filter before output enters context:

**Unfiltered Command (Avoid)**:
```text
COMMAND: ls -la src/components/
TOOL_OUTPUT: [200 lines of file listing loaded into context]
```

**Filtered Command (Preferred)**:
```text
COMMAND: rtk find src/components/ -name "*.tsx"
TOOL_OUTPUT: [5 matches: src/components/AuthModal.tsx, ...]
AGENT: Located relevant auth component.
```

### 2. Artifact Spilling for Heavy Payloads

When a tool produces bulk data (logs, database dumps, large API responses), write to an artifact and reference it:

**Spill to Artifact**:
```text
TOOL_CALL: run_query (returned 500 rows)
TOOL_OUTPUT: [Wrote 500 rows to artifact://query-result.json (142 KB). Preview (first 2 rows): ...]
AGENT: Inspected preview; loading specific row by key from artifact.
```

### 3. Failure Summarization

Avoid repeating verbose failure traces across retries. Extract the distinct failure reason:

**Summarized Failure**:
```text
TOOL_OUTPUT: [Command timed out after 3 retries: connection refused on 127.0.0.1:5432]
AGENT: Database is unreachable; checking connection configuration before next attempt.
```
## Integration with Runtime Tooling

- **Filter at source**: Use tools with built-in filtering (e.g. `rtk` CLI proxy, grep, line range selectors) to avoid loading massive payloads into the context window.
- **Artifact spilling**: Write large payloads to external artifacts/files and include only a concise summary and file path in conversation history.
- **Runtime-managed collapsing**: Where the host runtime supports automatic UI folding or artifact collapsing, leverage host-managed blocks rather than expecting in-place history mutation.
