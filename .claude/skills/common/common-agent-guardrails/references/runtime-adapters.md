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

- A hook that only prints a reminder is advisory. Do not record it as an enforced control.
- A host's installed policy, hook, or capability declaration is not proof that all relevant routes are intercepted. Verify the exact host, configuration, action, and alternate routes before claiming enforcement.
- Only some hosts honour a blocking exit from a pre-tool hook. Verify with a safe deliberate violation and preserve the observed result.
- Skills, prompts, indexes, hashes, scans, and repository settings communicate or inspect policy; they do not themselves prevent reads, execution, network access, credential exposure, or descendant actions.
- Organization-managed settings may outrank project config. Confirm the effective configuration instead of assuming precedence or inheritance.
- Subagents and background runs may not inherit project hooks. Confirm inheritance, or enforce the same class in CI where the work lands.
- For untrusted-workspace review, distinguish declared policy from observed/verified behavior and report unknown or untested routes as unavailable or not run. A scan result is not install-safety or isolation evidence; see [admission guidance](untrusted-workspace-admission.md).

## Verification

For each enforced class, keep one reproducible check: attempt the forbidden action, capture the
block output, and store it as the control's evidence. Re-run the checks whenever the policy or the
host configuration changes; an unverified guardrail is a claim, not a control.
