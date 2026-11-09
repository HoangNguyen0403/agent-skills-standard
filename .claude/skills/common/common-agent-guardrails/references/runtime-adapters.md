# Runtime Adapters

The policy in `guardrails-template.yaml` is runtime-neutral. The table below lists potential
host integration locations, not installed or effective proof. Missing verification or mapping on
a host means enforcement is unknown, not absent capability. Only a confirmed, tested route that fails
to intercept the attempted action establishes that the control is unenforced for that route.
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

## Five-Checkpoint Assurance Map

A complete guardrail review evaluates five distinct checkpoints across the agent lifecycle. Each checkpoint has an authoritative teaching owner that defines guidelines and an actual enforcement owner that executes restrictions.

| Checkpoint | Description | Teaching Owner | Actual Enforcement Owner | Applicable Routes | Limitations & Evidence State |
| --- | --- | --- | --- | --- | --- |
| 1. Input | Direct user prompts, task instructions, attachments | [common-llm-security](../../common-llm-security/SKILL.md) | Client / Host UI & Host API ingress filters | Prompt ingestion, user turn, API ingress | Delimiters/prompts are structural cues, not host containment; client/host API enforcement remains unverified unless observed. |
| 2. Retrieval | RAG context, local search/read, web/MCP fetches | [common-llm-security](../../common-llm-security/SKILL.md) | Tool runtime, local environment, egress proxy | Filesystem reads, MCP transport, outbound HTTP | Tool content is untrusted data; static scanning or retrieval filters do not guarantee runtime isolation or egress prevention. |
| 3. Tool Calls | Agent tool executions, file edits, shell commands | [common-agent-guardrails](../SKILL.md) | Host interception hooks (`PreToolUse`), OS/container sandbox | Native tools, subshell/bash, spawned descendants | Hooks enforce only mapped tools; alternate execution paths, subagents, or unintercepted descendants require explicit verification. |
| 4. Output | LLM responses, file writes, outbound network | [common-llm-security](../../common-llm-security/SKILL.md) | Host egress filters, downstream sink parameterization, DOM escaping | LLM response stream, file modification, API egress | Schema validity and redaction do not reverse prior leakage; output handling cannot substitute for upstream execution blocks. |
| 5. Human Approval | Production deployment, migration, privilege escalation | [untrusted-workspace-admission](untrusted-workspace-admission.md) | Host approval channel, independent human operator | Production commands, irreversible actions, policy changes | Agent permission responses or self-approvals cannot satisfy human-only gates; host approval UI must be independently verified. |

## Verification

For each enforced class, keep one reproducible check: attempt the forbidden action, capture the block output, and store it as the control's evidence using the [admission reporting conventions and evidence states](untrusted-workspace-admission.md#report-do-not-overclaim) (declared, observed, verified, unavailable, failed, not run). Distinguish direct subprocess results (e.g. executing a standalone hook script) from actual host-interception proof across all entry routes. Re-run checks whenever policy or host configuration changes; an unverified guardrail is an unverified claim, not an active control. For concrete examples of declared-only and direct-hook evidence assessments, see the [illustrative assessment records](untrusted-workspace-admission.md#illustrative-assessment-records).
