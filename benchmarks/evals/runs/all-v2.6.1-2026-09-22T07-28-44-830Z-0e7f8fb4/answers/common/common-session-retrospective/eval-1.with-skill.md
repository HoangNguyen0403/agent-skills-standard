| Correction event | Root cause | Evidence and impact | Candidate action |
|---|---|---|---|
| Available skill was not selected | Routing / trigger miss | `common-session-retrospective` was applicable to a correction review but was not loaded. | Add or refine trigger aliases for “correction event,” “root-cause review,” and “rework analysis.” Emit the required trigger-miss record naming the skill, phrase, and routing fix. |
| Skill example used an unsupported flag | Example contradiction / procedure gap | The example instructed a control that the current interface does not support, creating avoidable rework. | Mark the candidate `proposed`; validate every command/API example against the supported interface, remove or replace the unsupported flag, and add a held-out compatibility test. |
| Tool ignored its network policy | Tool/adapter enforcement failure | Runtime behavior did not honor the configured network restriction. This is an execution-control defect, not merely a wording issue in the skill. | Enforce policy at the tool/adapter boundary, fail closed when policy state is unavailable, and add tests for allowed, denied, and policy-mismatch cases. Do not patch a skill for a runtime permission failure. |

### Trigger miss

```text
skill_id: common-session-retrospective
indirect_phrase: review three correction events / root-cause analysis
evidence: applicable skill was available but not selected
fix: add routing aliases and require trigger-miss reporting
status: proposed
```

### Candidate actions

- Keep all three actions proposal-only; no files, canonical registry entries, installed copies, or exports should be changed without explicit maintenance authorization.
- Review `AGENTS.md` and `AGENTS_LEARNING.md` for duplicate guidance and redacted correction evidence before implementation.
- Independently validate the example correction and tool-policy fix against held-out cases, preserving the original failures.
- Require independent maintainer approval before promotion; record the source revision, evaluation run, review reference, and rollback version.
