## Session Retrospective Report

**Correction loops found:** 1 explicit trigger miss.

The agent wrote API endpoints while ignoring the available security skill. This is a trigger miss, not evidence that the security guidance itself is incomplete: the task wording “writing API endpoints” should have activated the security skill before implementation.

### Trigger miss

```json
{
  "trigger_miss": {
    "skill": "common-security-standards",
    "indirect_phrase": "writing API endpoints",
    "root_cause": "keyword_not_in_triggers",
    "fix": "add keywords 'API endpoint', 'API route', 'HTTP endpoint', 'REST endpoint', 'route handler', 'request validation', and 'authentication/authorization' to the skill triggers"
  }
}
```

### Targeted maintenance proposal

Extend the existing security skill’s trigger keywords rather than creating a duplicate skill. Also add a pre-write gate to the relevant API implementation workflow: when an endpoint, route handler, request validation, authentication, authorization, or externally reachable handler is planned, load the security skill before editing. Update the canonical skill source and every configured agent directory, then update the `AGENTS.md` index if trigger metadata is mirrored there.

No files were changed in this evaluation response. Estimated prevention: one correction round for each future API task that uses this wording, subject to verification after the trigger update.

