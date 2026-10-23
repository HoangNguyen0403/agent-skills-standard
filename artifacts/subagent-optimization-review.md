# Subagent Optimization Review

Date: 2026-10-23. Status: analysis complete; direction approved by requesting operator; implementation not authorized. Scope: delegation skills, lifecycle workflows, specialist exports, MCP loading, evaluation and cost evidence. Not a whole-codebase security audit or provider runtime certification.

## Conclusion

The registry already has useful delegation discipline, but it does not establish that delegated execution is cheaper or equally capable across hosts. The main gaps are worker-specific context delivery, inconsistent execution policies, runtime capability verification, and full-task measurement. More agents or shorter prompts alone will not solve them.

Keep the existing registry -> CLI exports -> host runtime architecture. Strengthen its contracts and evidence. Do not turn the standards MCP into an agent-execution framework.

Evidence labels: **confirmed** means source inspection or an observed scenario; **inference** means plausible consequence not measured in a production run; **unknown** means evidence was unavailable.

## Current system and useful controls

- **Confirmed:** `skills/**` and `.agents/workflows/*.md` are canonical; native directories are exports. `ARCHITECTURE.md:155-175`.
- **Confirmed:** architecture already requires host-neutral guidance; provider/account/profile/model specifics belong in host planning records. `ARCHITECTURE.md:110`.
- **Confirmed:** SDD already defines fresh bounded workers, no recursive delegation or worker commits, focused checks, file-reference briefs, compact returns, cumulative revision-bound review packages, and independent reviews. `skills/common/common-subagent-driven-development/SKILL.md:30-74`; `references/templates.md:27-56,84-96`.
- **Confirmed:** context policy already requires full-actor cost measurement, cache/replay accounting, retrievable evidence, and no speculative savings. `skills/common/common-context-optimization/SKILL.md:24-35`.
- **Confirmed:** implementation workflow already requires ownership, settled revisions, behavioral smoke and a covering final gate. `.agents/workflows/implement-feature.md:13-22`.
- **Confirmed:** cost journaling already distinguishes actor roles, failed/retried/interrupted attempts, cache, reasoning, orchestration usage and coverage completeness. Supported journal formats are currently `codex | omp`. `mcp/src/services/SessionJournal.ts:6-67`. Extend this work; do not replace it with a second ledger.
- **Unknown:** actual aggregate savings, repair cost, latency improvement and quality differences from current delegation policies.

## Prioritized findings

### F1 — High: MCP deduplication does not establish delivery to each worker

**Confirmed:** `finalize()` keys suppression by category/skill against the tracker's loaded set, without worker identity. `mcp/src/tools/index.ts:905-953`; `mcp/src/services/SessionTracker.ts:54-79`.

**Observed:** after concurrent scout consultations, the parent received `already loaded this session, body omitted` for standards whose bodies it had not received. `force_reload: true` returned the bodies. Both scouts also reported shared consultation history. This is a confirmed problem in this shared-server topology, not proof that every host shares an MCP process.

**Impact [inference]:** a fresh worker can miss authoritative instructions while the audit appears to show consultation. Reloading everything indiscriminately avoids omission but wastes context.

**Proposal:** scope delivery/dedup by authenticated host context identity plus content revision. Distinguish selected, body-returned and acknowledged-delivered evidence. Where identity cannot be established, return complete required bodies rather than suppressing them based on another context's history. An agent-supplied ID alone is not authorization or proof of receipt. Existing `force_reload` is a temporary explicit workaround.

### F2 — High: standalone task extraction can omit global constraints

**Confirmed:** `task_brief.py:43-81` copies only the selected task section. The worker template says this brief contains full requirements/files/verification commands (`references/templates.md:14-19`), with manual context slots as a partial mitigation.

**Observed smoke:** the actual helper retained Task 1 and excluded Task 2, but omitted a plan-level read-only authority and tenant-isolation invariant. No worker was launched and no unauthorized action was observed.

**Proposal:** assemble a bounded delegation packet containing the task plus applicable global constraints, authority, dependency outputs, owned paths, ACs, verification and revision. Validate completeness before dispatch. Do not paste the whole plan or require every worker to rediscover it.

### F3 — High: escalation instructions conflict with host approval policy

**Confirmed:** SDD methodology permits higher-tier escalation in rounds 4–5 and calls for the most capable final reviewer. `skills/common/common-subagent-driven-development/references/methodology.md:40-54`. The main skill only says a capable final reviewer (`SKILL.md:65`).

The current host policy instead requires eligible project/account profiles and explicit approval for premium consultation. Host policy wins, but the canonical reference still teaches conflicting behavior. No unauthorized premium call was made in this review.

**Proposal:** separate failure classes: missing prerequisite, exhausted provider, defective output, unresolved design/safety issue. Resolve prerequisites; apply the authorized fallback ladder only for its permitted triggers; use bounded corrective feedback for defects; request human approval for consequential premium advice. Neither task size nor retry count authorizes premium. Keep named commercial profiles out of canonical registry guidance.

### F4 — High: export compatibility is not runtime subagent parity

**Confirmed:** `AgentDefinition` models file formats, paths, hooks, MCP and size limits, not spawn/resume/cancel/context/usage capabilities. `cli/src/capabilities/agentCapabilities.ts:41-69`. File-presence detection is not runtime negotiation (`cli/src/services/DetectionService.ts:114-132`).

**Confirmed:** the Copilot specialist transform emits `.instructions.md` with `applyTo: '**/*'`, not the current documented `.github/agents/*.agent.md` custom-agent shape. `cli/src/services/utils/SpecialistTransformer.ts:125-128`. This proves a format mismatch for native custom-agent export; it does not prove those files are automatically loaded or that all Copilot surfaces behave identically.

**Confirmed:** permissions are only partly projected: Claude tools, Codex sandbox mode, and warning comments for unsupported declarations. `SpecialistTransformer.ts:95-169`. Comments do not enforce permissions.

**Proposal:** distinguish instruction export, native agent discovery, successful invocation and enforced restrictions. Track support by host surface/version, not model vendor alone. A Claude model inside another harness does not imply Claude Code capabilities. Preserve explicit unsupported-control disclosures and block only operations that require unavailable controls.

### F5 — Medium: canonical execution semantics are bound to one tool vocabulary

**Confirmed:** SDD references literal `wait()`, `send_agent_prompt`, `get_agent_status`, and `get_agent_activity`. `references/methodology.md:34-42`. This conflicts with the host-neutral architecture boundary.

**Proposal:** canonical language should describe dispatch, passive completion, resume, cancel and collect semantics. Existing export/host integration maps those semantics to actual tools. Do not prescribe polling or fabricate a missing invocation. Unsupported hosts use an explicitly authorized inline/manual path or report the specific capability gap.

### F6 — Medium: freshness/review policies lack a task-economics decision

**Confirmed:** SDD requires a fresh implementer and task review for every task plus final branch review (`SKILL.md:30,56-65`); review-ticket lists six specialist lenses without explicit tier-conditioned selection (`.agents/workflows/review-ticket.md:17-24`). A lens list does not itself prove six agents are always spawned.

**Confirmed:** SNC provides `fast | standard | strong`, while worker templates use cheap/analysis/mid-tier defaults without a complete mapping (`references/templates.md:10,68,136`; `common-task-complexity-routing/references/routing-table.md:22-24`).

**Proposal:** decide at coherent task boundaries, not arbitrary plan-heading boundaries. Fresh context for independent tasks or a necessary trust/review boundary; resume the same worker for bounded fixes to the same task. Batch tiny related steps only when ownership, permissions and verification remain coherent. A specialist lens need not become a separate billed session. Retain independent and human reviews wherever risk/policy requires them; never optimize by bypassing those gates.

**Unknown:** actual unnecessary spawn count or benefit of batching. Measure before claiming improvement.

### F7 — Medium: evidence retention and inline authorization contradict other instructions

**Confirmed:** SDD offers Inline but also categorically prohibits inline multi-task edits (`SKILL.md:34-37,72`). SDD deletes its workspace after review (`SKILL.md:65`; methodology `:54`), although that workspace holds briefs/reports/review packages and context policy prohibits evidence deletion.

**Proposal:** state the authorized small-risk inline exception precisely. Before workspace cleanup, preserve the required receipts and immutable review artifacts at durable references under a documented retention policy. Keep temporary scaffolds disposable without breaking handoff links.

### F8 — Medium: evaluation evidence does not prove orchestration effectiveness

**Confirmed:** the concrete evaluation runner invokes Codex and asks workers not to use tools; these are answer evaluations rather than native orchestration exercises. `scripts/evals/execute.ts:135-170`. SDD evals contain substring assertions and an unsupported absolute claim about polling token magnitude. `skills/common/common-subagent-driven-development/evals/evals.json:5-16,35-46`.

**Confirmed:** the committed report labels catalog outcome/activation/release readiness NOT READY and reports composite skill-answer evidence. `evals-report.md:3-36`. These results are useful but not measurements of subagent cost or provider parity. The SDD skill does not appear in that report's inspected delegation-name search.

**Proposal:** keep trigger/answer evaluations as one evidence layer. Add executable host contract scenarios and matched task-level trials. Replace claims about hypothetical token savings with observed usage or explicitly unknown cost. Do not re-pin incidental wording tests.

### F9 — Medium: workflow lookup can diverge from installed native invocation

**Confirmed:** MCP scans only `.agents/workflows` (`mcp/src/services/WorkflowIndex.ts:16-25`), whereas provider workflow exports use other paths (`ARCHITECTURE.md:161-173`).

**Impact [inference]:** a provider-only installation may invoke a native workflow while mandatory MCP workflow discovery cannot find it. Consumer install state was not exercised here.

**Proposal:** establish one installed provider-independent workflow catalog or shared manifest used by native exports and MCP discovery. Avoid reverse-parsing every generated format into a new canonical source.

### F10 — Medium: workers repeat broad discovery and can load irrelevant skills

**Confirmed:** server instructions tell every assigned worker to discover workflows and follow the entire workflow sequence (`mcp/src/server.ts:103-131`), while decision discipline says specialists should execute their briefs without repeating parent intake (`skills/common/common-decision-discipline/SKILL.md`, Size The Work). The shared audit showed three workflow-discovery calls across parent and scouts.

**Observed:** a parent keyword request concerning operator profile/task complexity returned performance engineering and accessibility alongside the relevant rules. Scout keyword routing also returned design/UI-automation standards unrelated to their assigned read-only maps. This proves extra body delivery in these calls, not a measured degradation or a catalog-wide false-positive rate.

**Proposal:** distinguish orchestrator bootstrap from worker bootstrap. A worker should validate its assigned contract, load the exact applicable standards into its own context, and report evidence—not rerun global intake or discover all workflows. Prefer exact skill IDs/file routing once scope is known; keep skill metadata concise and tighten collision-prone keyword/composite routing with held-out positive and negative cases. Do not confuse eliminating redundant discovery with skipping necessary worker-specific body delivery.

## External evidence: what transfers and what does not

1. [Foojay: agents, subagents, skills and MCP](https://foojay.io/today/best-practices-for-working-with-ai-agents-subagents-skills-and-mcp/). Read the article. Transfer bounded roles, precise task specs, least privilege, structured summaries and deterministic checks. Reject universal claims that context isolation provides filesystem/security isolation or that subagents cannot communicate: those depend on the harness. Its productivity-study interpretation is not evidence of this repository's savings.
2. [Salesforce: subagent instruction practices](https://help.salesforce.com/s/articleView?id=ai.copilot_topics_instructions.htm&type=5). Static reader failed; browser-rendered article recovered. Transfer minimal noncontradictory instructions, consistent terminology, explicit sequencing and coded deterministic rules. Agentforce topics/subagents are not proof of coding-agent process isolation or equivalent invocation.
3. [UXPlanet: subagent optimization](https://uxplanet.org/best-practices-for-claude-code-subagents-optimization-7ff0dd3e20b5). Static fetch returned 403; browser exposed the introduction and member-only gate. Only its stated four goals—context usage, token cost, tool safety and reliability—were accessible. The 14 tips and template were not reviewed; no claims are attributed to that unavailable body.
4. [PubNub: Claude Code subagents](https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/). Read the article. Transfer single responsibility, explicit tools, traceable handoffs, safe concurrency and meaningful human approvals. Do not copy Claude hook configuration into canonical workflows or treat its dated limitations on planning/visibility as universal current behavior.
5. [Claude Academy: designing effective subagents](https://academy.claude.com/courses/introduction-to-subagents/designing-effective-subagents). Read lesson text. Transfer descriptions that steer invocation input, explicit output/stop conditions, obstacle reporting and restricted tools. A reviewer verdict is advisory; agents do not supply required human merge/deploy approval.

Primary cross-provider documentation checked:
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents): separate context, descriptions/tool/model configuration, usage charged to the session; native subagents differ from cross-session teams.
- [OpenAI subagents](https://developers.openai.com/codex/multi-agent), redirected to [current configuration docs](https://learn.chatgpt.com/docs/agent-configuration/subagents): per-agent model/effort and inherited sandbox controls; explicitly warns of greater token consumption than comparable single-agent runs.
- [Gemini CLI subagents](https://geminicli.com/docs/core/subagents/): agents exposed as tools, focused loops and host-specific configuration. Gemini and Antigravity must be verified separately; the page itself warns about their changing availability.
- [Copilot custom agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents): native agent profiles, scoped tools and surface-dependent model settings. A custom agent is not automatically a nested subagent on every Copilot surface.

Documentation was checked live; no named provider's native delegation runtime was launched here. Runtime claims require version-pinned smoke evidence.

## Recommended provider-neutral design

Use three layers, extending existing components rather than adding a general orchestration engine:

1. **Semantic policy:** when delegation is useful; task/risk class; required independence and approvals; context and output contracts; retry/stop rules. Owned by canonical skills/workflows.
2. **Host capability binding:** supported invocation/lifecycle operations, instruction inheritance, filesystem/artifact accessibility, tools/permissions, model/effort mapping and usage availability. Static install metadata and runtime observations must be distinguished. Owned by existing CLI adapters plus host integration, not inferred by the standards MCP.
3. **Execution evidence:** actual actor/parent/task IDs, selected eligible profile, content/revision receipts, lifecycle events, verification, full cost and missing coverage. Extend existing journals and reports.

### Delegation decision

Apply in order: authority/data eligibility -> required controls -> task benefit -> eligible capability/model -> execution -> independent acceptance.

- Prefer direct execution for a single small coherent slice when host policy permits it.
- Delegate independent substantial work, noisy research, or a required independent review.
- Parallelize only dependency-ready disjoint ownership; do not serialize independent research merely because the SDD example is a loop.
- Do not run shared-state checks against unsettled peer edits. Independent isolated verification may be parallel only when the environment and evidence contract support it.
- Before spawning, state the intended benefit: latency, main-context protection, specialization, or independence. Lower cost is a hypothesis until measured.
- Explicit host delegation requirements remain binding; changing those is a separate owner-approved policy decision.

### Minimal delegation packet

Task and parent IDs; goal; project/account eligibility; authority and forbidden actions; owned paths; relevant global invariants; dependency outputs; REQ/ACs; source revision/content digests; required skill bodies/references; verification command/scenario; output artifact location; stop conditions and resource limits.

The host resolves profile/model/effort after eligibility. `model_tier` is a capability hint, never permission to spend or cross account boundaries. File references require proven worker access; otherwise send a bounded immutable artifact through an available transport.

### Minimal worker receipt

Status (`done`, `blocked`, `needs_context`, `failed`); task/revision identity; changed paths or findings; AC evidence; commands/results; obstacles and necessary workarounds; unresolved risks; artifact references; actual usage or `unavailable` with reason. Detailed evidence stays retrievable; parent return stays compact. Successful process exit is not acceptance.

### Lifecycle and limits

Semantic states: prepared -> running -> completed/blocked/failed/cancelled -> verified. Resume only the same task with valid prior context; establish a fresh worker for independent work or required review. Declare maximum attempts, concurrency and available token/time/cost bounds. Bounds are host-enforced only where demonstrated; otherwise label them advisory. A timeout is not completion and cancellation support must be verified.

## Measurement and rollout

**Primary objective:** reduce full-task cost per accepted result while preserving behavior and approval boundaries. Parent-only token reduction is not the objective.

Measure parent + all workers + reviewers + retries + failed/cancelled attempts + integration. Separate uncached input, cache read/write, output and reasoning according to provider billing semantics; do not double-count reasoning already included in output. Keep estimated rates, subscriptions/quota usage and actual invoices distinct.

Use the same task inputs, revision, tools and verification for three arms: eligible single-agent baseline, current delegation, proposed delegation. Run only accounts/models approved for the project. Freeze model/tool versions within each comparison, repeat trials and retain failures. Include tiny fixes, multi-file isolated work, dependency chains, shared-file conflicts, review-only work, tool-heavy research, missing MCP inheritance, stale revisions, cancellation and exhausted-provider cases.

Report accepted-task rate, consumer-visible failures, first-pass acceptance, false positives, retries, wall time, full-actor usage/cost and cost coverage. Compare cost per accepted task across all attempts, not just successful survivors. Evaluate faster/cheaper workers by task class; do not assume the cheapest call yields the cheapest accepted result.

Proposed promotion gate: all deterministic authority/isolation/contract scenarios pass, no observed loss of required behavior or review independence on held-out tasks, complete usage coverage for savings claims, and a documented task-class Pareto improvement in cost/quality/latency. Set numerical savings targets only after baseline. Unknown usage is not zero.

Recommended order:
1. Correct context-delivery, brief-completeness, escalation and retention contradictions; preserve safety controls.
2. Reconcile model hints and delegation granularity; add host-neutral semantic requirements and strict unsupported-capability disclosures.
3. Verify native exports/discovery/invocation on approved Claude, Codex, Copilot and Gemini/Antigravity surfaces; fix mismatches in canonical transformers and regenerate exports.
4. Extend existing full-actor telemetry and executable scenarios; canary measured routing changes by task class. Retain rollback to the last approved registry version.

## Verification performed and limits

- Read canonical sources and two independent bounded scout maps; confirmed primary findings against source ranges.
- Exercised live MCP routing: observed shared-context dedup omission; forced reload returned required bodies. Reported the mismatch through the tool issue channel.
- Ran the real `task_brief.py` against a temporary two-task plan: selected task retained, other task excluded, global authority and invariant both omitted. Probe files were removed; no permanent test added.
- Reviewed the five supplied sources subject to the UXPlanet paywall limitation and checked current primary provider documentation.
- No implementation, generated mirror, approval control or profile configuration changed. No full test suite, paid multi-provider benchmark, production action or provider-native subagent run was performed. No savings number is claimed.

Direction approved in `docs/brd/brd-provider-neutral-delegation.md`; requirements and delivery slices are recorded in `docs/prd/prd-provider-neutral-delegation.md` and `docs/plans/provider-neutral-delegation.md`. Next: technical design. Implementation approach, account eligibility, spend and rollout remain separately governed.
