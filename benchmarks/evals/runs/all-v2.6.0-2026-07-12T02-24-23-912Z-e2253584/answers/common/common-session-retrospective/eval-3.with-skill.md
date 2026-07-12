## Session Retrospective Report

**Correction loops found:** 1 actionable feedback signal: the security skill was ignored during API-endpoint work. No other concrete corrections are supplied.

### Findings and fixes

| # | Signal | Root cause | One targeted fix |
|---|---|---|---|
| 1 | Security skill skipped for API endpoints | Trigger Miss | Add API/route-handler/request-validation/authentication/authorization keywords to the existing security skill triggers and enforce a pre-write security-skill load for endpoint work. |

### Trigger-miss block

```json
{
  "trigger_miss": {
    "skill": "common-security-standards",
    "indirect_phrase": "writing API endpoints",
    "root_cause": "keyword_not_in_triggers",
    "fix": "add keywords 'API endpoint', 'API route', 'HTTP endpoint', 'REST endpoint', 'route handler', 'request validation', and 'authentication/authorization' to skill triggers"
  }
}
```

### Improvement plan

1. Search the existing `AGENTS.md` index and security skill before creating anything, avoiding duplicate coverage.
2. Update the canonical security skill trigger metadata and propagate it to all configured agent skill directories.
3. Add an endpoint pre-write checklist requiring input validation, authentication, authorization, injection resistance, error handling, and tests.
4. Run the repository’s trigger/index checks and a focused API-task activation test.
5. Run the session compliance audit and record a learning-log entry only if a confirmed correction loop meets that log’s protocol.

This response proposes maintenance only; it does not apply repository changes. No additional skill gap is supported by the prompt’s evidence.

