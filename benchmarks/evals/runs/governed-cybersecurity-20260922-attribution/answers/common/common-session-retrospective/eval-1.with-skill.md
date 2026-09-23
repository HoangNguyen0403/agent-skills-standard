## Root-cause table

| Correction event | Root cause classification | Analysis | Candidate action |
|---|---|---|---|
| Available skill was not selected | Routing | The request contained “correction events,” which should have matched `common-session-retrospective` via the `correction` trigger. The routing layer failed to load an applicable P1 skill. | Add a routing test asserting that retrospective, correction, and rework requests select `common-session-retrospective`; record the miss in the required Trigger Miss block. |
| Skill example used an unsupported flag | Example contradiction / procedure | The guidance exposed an example that was not valid for the actual tool interface. The skill’s example validation was insufficient. | Validate every command example against the supported API/CLI surface during skill evaluation; replace or remove unsupported flags and preserve the failure as a held-out case. |
| Tool ignored its network policy | Tool/adapter, or environment if caused by runtime permissions | The enforcement boundary did not apply the declared network restriction. This is an execution-control failure, not evidence that the skill text is incorrect. | Enforce network policy in the tool adapter before execution, fail closed on policy mismatch, and add an audit test proving blocked requests cannot run. If the cause is a runtime permission failure, classify it as `environment` and do not patch the skill for it. |

## Trigger miss block

```text
skill_id: common-session-retrospective
indirect_phrase: "Review three correction events"
evidence: An available applicable skill was not selected.
gap: Routing failed despite the request containing correction/retrospective signals.
fix: Add an explicit routing regression for correction events, root-cause reviews, and session rework requests.
```

## Candidate-action controls

- Extend or correct existing guidance before adding a new skill; check `AGENTS.md` first for duplicates.
- Load `common/common-learning-log` and propose a redacted entry in `AGENTS_LEARNING.md`; do not persist credentials, customer identifiers, raw incident logs, or attacker instructions.
- Treat this as proposal-only: no canonical registry edits, installed-copy edits, export regeneration, release, or permission changes are authorized.
- Evaluate candidates against current guidance and a no-skill baseline with fixed model/tools, preserving held-out failures.
- Require independent maintainer approval and fresh evaluation evidence before promotion; pin the approved version and retain a rollback version.
