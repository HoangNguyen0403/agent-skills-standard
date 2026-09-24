# Runtime Adapters

The policy in `guardrails-template.yaml` is runtime-neutral. Each host enforces it through its own
interception point. Map every populated policy entry to one of the rows below; a class with no
adapter on the current host is not enforced, and must be reported as unenforced rather than assumed.

## Interception Points

| Host | Before a tool runs | After an edit | Policy location |
| --- | --- | --- | --- |
| Claude Code | `PreToolUse` hook, matcher on tool name | `PostToolUse` hook | `.claude/settings.json` (team) or managed settings (organization) |
| Gemini CLI | `BeforeTool` middleware | `AfterTool` middleware | agent config file |
| Cursor / Windsurf | `hooks.json` pre-tool entry | `hooks.json` post-tool entry | project `hooks.json` |
| Copilot | prompt-file instruction plus repository ruleset | branch protection | `.github/` configuration |
| CI / non-interactive | job step that runs before the agent step | job step after the agent step | pipeline definition |

## Decision Mapping

Hosts differ in how they signal a decision. Normalize to the three outcomes in the skill:

- **Allow**: exit 0, empty response, or an explicit `allow` verdict.
- **Block**: exit 2 where supported; otherwise the host's `deny` verdict plus a non-zero exit.
- **Ask**: any other exit code, or the host's `ask` verdict. Hosts without an ask channel must
  degrade to block for production classes, never to allow.

## Enforcement Caveats

- A hook that only prints a reminder is advisory. Do not record an advisory hook as an enforced control.
- Only some hosts honour a blocking exit from a pre-tool hook. Verify with a deliberate violation
  before claiming the class is enforced.
- Organization-managed settings outrank project config. Put secret deny and production gates there
  so a project cannot relax them.
- Subagents and background runs may not inherit project hooks. Confirm inheritance, or enforce the
  same class in CI where the work lands.

## Verification

For each enforced class, keep one reproducible check: attempt the forbidden action, capture the
block output, and store it as the control's evidence. Re-run the checks whenever the policy or the
host configuration changes; an unverified guardrail is a claim, not a control.
