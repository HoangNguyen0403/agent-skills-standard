# T0 — baseline and dispatch readiness

Status: T0 evidence complete; core source/eval dispatch ready for lead assignment. No efficacy, acceptance, paid-pilot, release or deployment claim.

## Baseline and acceptance

- Revision: `92d06c420f6a41f08e11579423e4e3eacdb7880d`.
- Initial intentional dirty state: only `?? docs/prd/prd-backend-system-design-roi-improvement.md`. Preserved current bytes, including this untracked user plan; nothing reverted.
- AC-ROI-00: **met for selected current-AGS inputs**. `baseline-manifest.json` records exact paths, byte counts, SHA256 and retrieval paths for **6,417 files / 11,044,066 bytes**. `baseline-snapshot/` retains originals, including complete current system-design packages/evals, governing generic packages, historical benchmarks/runs/fixtures, root reports, both PRDs, workflow and publication dependencies. `baseline-verification.json` records **0 retained-snapshot hash mismatches; 0 live-input hash mismatches** at 2026-10-26T16:26:28.236Z. This is an actual local capture/readback check, not a proposed check.
- AC-ROI-01: **ready/verified at T0 boundary**. `dispatch-locks.json` assigns 17 exclusive canonical/output paths across T1/T2/T3/T5. Node assertion check returned `{"exclusive_paths":17,"duplicate_owners":0,"task_keys":["T1","T2","T3","T5"]}`. Lead attests no active source owner beyond lead; later T5 worker `fecc653b-0988-4afd-a478-4a40d7252f62` is evidence/rubric-only until T0 passes. Actual source mutation requires lead's owner assignment; this JSON is coordination, not host enforcement.
- `overlap-map.md` classifies each T1–T4 mechanism with canonical path/line evidence and preserve/extend/correct decision. Existing professionalization work is current baseline, not unfinished historical tasks.

## Exact deltas to dispatch

- **T1:** qualify least-connections/request cost and multiplexing; align shared/optional-dependency readiness; active/passive failure detection/recovery; derive residual failure capacity; finite admission/stream buffer/cancellation/reconnect/drain bounds; connect retry-layer ownership and downstream ceilings; explicit TLS trust boundary and DNS-cache limits; replace mandatory gateway pass-through with auth/quota-aware failure policy; specify atomic limiter authority and partition/overshoot behavior. Preserve existing queues, deadline budgets, pool caps, session choices and RO health checks. Communication owns existing DNS/retry guidance read-only.
- **T2:** extend existing flow/copy/deletion authority with authenticated scope through source/vector/lexical/rerank/cache/job/result stages, privileged-role/RLS bypass and pooled-context reset; specify retrieval-copy revocation/invalidation enforcement. Existing DA deletion/job evals 9–10 already cover scoped cleanup and missing tenant claim: extend, do not rewrite as absent.
- **T3:** reuse read-only idempotency contract (stable operation identity, ambiguous effect reconciliation, retention), add atomic inbox/event-versus-operation identity and broker/effect boundary; correct step-count/universal compensation prescriptions; add durable timers, activity heartbeat/cancellation/late effect, replay determinism and running-version compatibility. Existing integration eval case 2 pins the contradictory step-count rule and must be replaced by T5.
- **T4:** specialized semantic cache authority and reserve/settle/uncertain-billing protocol are missing; generic LLM security/PII/namespace/spend-limits exist. Conditional only; no owner or execution authorization.
- **T5:** independent sealed core cases plus source-bound lexical updates after candidate freeze; exactly four changed packages and justified governing dependencies, not historical 11-skill selection (which omits building-blocks/integration-patterns). Historical fixtures are visible regressions, not blind efficacy evidence. Executable candidate lane and paid execution remain separately gated.

## Shared locks and authority

Proposed exact T6 shared paths: `skills/metadata.json`, `skills/system-design/_INDEX.md`, `skills/README.md`, `docs/agent-capabilities.md`, `CHANGELOG.md`, `AGENTS.md` (attributable generated router content only; no policy mutation). Generated system-design namespaces across four mirrors are reserved to one integration owner, not blanket write authorization. Exact mirror copy-back allowlist must be fixed from accepted candidate paths before generation. No per-package metadata file was found; shared registry metadata is actual owner.

Approval evidence: historical professionalization PRD §7 lines 147–149 records Personal standard delivery/review approval. §9 line176 is stale; do not alter historical bytes. Current approval and authorized profile resolution are explicitly recorded in `lead-dispatch-contract.md` and dispatch message `6e3fd2c8-74f9-4f7a-a70f-5e046d72b0f1`. Cheap conflicts with Personal Codex restriction; DeepSeek is outside recorded approval; use Personal Delivery for implementation and Personal Analysis & Review independently. No authority inferred from public repository metadata.

## Receipts and limits

- Ran `rtk proxy git status --porcelain=v1 --untracked-files=all` and `rtk proxy git rev-parse HEAD` for initial evidence only.
- Ran evidence-only Node capture utility under `rtk proxy node`; original and snapshot SHA256 readback completed successfully. Temporary utility was removed after capture; no source scaffolding remains.
- Ran Node assertion check for exact lock uniqueness; exit 0.
- No build, lint, tests, formatter, generator, models or cloud execution. No canonical edits, commits or pushes.
- Evidence directory is ignored by `.agent/sdd/.gitignore`: original bytes are locally retrievable now, but **not yet an external durable archive**. T6 must preserve it outside generator/worktree scope before generation or workspace deletion. Generator may touch unrelated workflows, specialists and indexes; isolated generation plus attributable copy-back remains mandatory.
- Lead owns `progress.md` per update `f69d8919-2592-4705-a41f-ff381c03cb78`; T0 intentionally did not overwrite it. T5's new evidence is task output, not baseline input.
- Final MCP audit: `common/common-subagent-driven-development`, `product-management/product-requirements`, `javascript/javascript-language`; no routed-category gaps. Utility language rules were loaded by direct lookup after file routing returned no match; no claim of pre-write JavaScript coverage. Startup instruction also read and correctly deferred worker behavior to assignment.
- Cost: host token usage/pricing unavailable; total cost unknown, not zero. MCP telemetry returned 6 calls/3 loaded skills at collection time; no labor/ROI claim.
